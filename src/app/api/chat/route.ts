import { NextRequest, NextResponse } from 'next/server'
import { openaiService, geminiService, StructuredNutritionResponse, AIQuotaError } from '../../../lib/openai'
import { searchProducts, searchProductsByTags, ProductSearchResult, getRecommendedCombos, getComboProducts, findMatchingCombo, COLLECTION_MAP, PRODUCT_COMBOS, getCollectionMap } from '../../../lib/shopify'
import { analytics } from '../../../utils/analytics'
import { dbService, IUserProfile } from '../../../lib/db'
import { detectLanguage, DetectedLanguage } from '../../../lib/language-detection'

/**
 * Simple in-memory rate limiter to prevent excessive API calls
 * Limits: 30 requests per minute per user/IP
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests per minute

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
     const now = Date.now()
     const record = rateLimitMap.get(identifier)

     if (!record || record.resetAt < now) {
          // Create new record or reset expired one
          rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
          return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS }
     }

     if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
          return { allowed: false, remaining: 0, resetAt: record.resetAt }
     }

     // Increment count
     record.count++
     return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetAt: record.resetAt }
}

// Clean up old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
     setInterval(() => {
          const now = Date.now()
          for (const [key, record] of rateLimitMap.entries()) {
               if (record.resetAt < now) {
                    rateLimitMap.delete(key)
               }
          }
     }, 5 * 60 * 1000)
}

/**
 * Health check throttling to prevent excessive API calls during cooldown periods
 * Only allows health checks once every 10 minutes per provider
 */
const healthCheckThrottleMap = new Map<'openai' | 'gemini', number>()
const HEALTH_CHECK_THROTTLE_MS = 10 * 60 * 1000 // 10 minutes between health checks

function shouldPerformHealthCheck(provider: 'openai' | 'gemini'): boolean {
     const lastCheck = healthCheckThrottleMap.get(provider)
     const now = Date.now()
     
     if (!lastCheck) {
          // First check for this provider, allow it
          return true
     }
     
     // Only allow if enough time has passed since last check
     return (now - lastCheck) >= HEALTH_CHECK_THROTTLE_MS
}

function recordHealthCheck(provider: 'openai' | 'gemini'): void {
     healthCheckThrottleMap.set(provider, Date.now())
}

/**
 * Extract supplement-related keywords from AI response for product search
 */
function extractSupplementKeywords(response: string): string[] {
     const supplementKeywords = [
          'vitamin', 'vitamins', 'vitamine', 'vitamines', 'mineral', 'minerals', 'minéral', 'minéraux',
          'supplement', 'supplements', 'supplément', 'suppléments', 'complément', 'compléments',
          'omega', 'oméga', 'd3', 'b12', 'magnesium', 'magnésium', 'calcium', 'iron', 'fer', 'zinc', 'selenium', 'sélénium',
          'probiotic', 'probiotics', 'probiotique', 'probiotiques', 'collagen', 'collagène', 'turmeric', 'curcuma', 'ashwagandha', 'ginseng',
          'multivitamin', 'multivitamine', 'fish oil', 'huile de poisson', 'protein', 'protéine', 'creatine', 'créatine', 'glutamine', 'bcaa',
          'antioxidant', 'antioxidants', 'antioxydant', 'antioxydants', 'herbal', 'herbs', 'herbes', 'extract', 'extracts', 'extrait', 'extraits',
          'capsule', 'capsules', 'tablet', 'tablets', 'comprimé', 'comprimés', 'powder', 'poudre', 'liquid', 'liquide', 'gummy', 'gummies',
          'organic', 'organique', 'natural', 'naturel', 'vegan', 'végétalien', 'vegetarian', 'végétarien', 'gluten-free', 'sans gluten', 'non-gmo', 'sans ogm'
     ]

     const foundKeywords: string[] = []
     const responseLower = response.toLowerCase()

     // Check for exact matches and partial matches
     supplementKeywords.forEach(keyword => {
          if (responseLower.includes(keyword)) {
               foundKeywords.push(keyword)
          }
     })

     // Remove duplicates and return unique keywords
     return [...new Set(foundKeywords)]
}

/**
 * Generate search queries from AI response for product recommendations
 */
function generateProductSearchQueries(response: string): string[] {
     const keywords = extractSupplementKeywords(response)

     // Filter out very generic supplement terms that don't map to specific products.
     // These are useful for intent detection but not for Shopify search queries.
     const genericTerms = new Set([
          'supplement',
          'supplements',
          'supplément',
          'suppléments',
          'complement',
          'complements',
          'complément',
          'compléments',
     ])

     const specificKeywords = keywords.filter(k => !genericTerms.has(k.toLowerCase()))

     // Only return keywords if we found specific supplement keywords
     // DO NOT fallback to generic terms - this prevents unwanted product searches
     if (specificKeywords.length > 0) {
          return specificKeywords.slice(0, 3) // Limit to top 3 keywords
     }

     // Return empty array if no specific keywords found
     // This will prevent product search when not appropriate
     return []
}

/**
 * Generate complementary product search queries
 * For example: if main product is Vitamin D, suggest Magnesium or K2
 */
function generateComplementaryQueries(mainQuery: string, mainProduct: ProductSearchResult): string[] {
     const complementaryMap: { [key: string]: string[] } = {
          'vitamin d': ['magnesium', 'vitamin k2'],
          'vitamin d3': ['magnesium', 'vitamin k2'],
          'magnesium': ['vitamin d', 'vitamin b6'],
          'calcium': ['vitamin d', 'magnesium'],
          'iron': ['vitamin c'],
          'omega': ['vitamin e'],
          'probiotic': ['prebiotic', 'fiber'],
          'protein': ['bcaa', 'creatine'],
     }

     const mainQueryLower = mainQuery.toLowerCase()
     for (const [key, complements] of Object.entries(complementaryMap)) {
          if (mainQueryLower.includes(key) || mainProduct.title.toLowerCase().includes(key)) {
               return complements
          }
     }

     // Default complementary searches
     return ['multivitamin', 'mineral']
}

/**
 * Map high-level health goals to Shopify product tags.
 * IMPORTANT: Make sure your Shopify products are tagged with these values
 * (e.g. "energy", "sleep", "stress", "immunity", etc.) so that goal-based
 * searches return relevant products.
 */
const GOAL_TAGS: { [goal: string]: string[] } = {
     energy: ['energy', 'fatigue'],
     sleep: ['sleep'],
     stress: ['stress', 'anxiety'],
     immunity: ['immunity', 'immune'],
     digestion: ['digestion', 'gut-health'],
     weight_loss: ['weight-loss', 'slimming'],
     muscle_gain: ['muscle-gain', 'muscle'],
     fitness: ['fitness', 'sport'],
     wellness: ['wellness'],
     heart: ['heart-health', 'cardio']
}

/**
 * Derive high-level health goals from the user profile and current conversation.
 * These goals are then mapped to Shopify tags via GOAL_TAGS for curated searches.
 */
function deriveGoalKeysFromContext(
     userProfile: IUserProfile | null,
     userLower: string,
     replyLower: string
): string[] {
     const goals: string[] = []
     const addGoal = (goal: string) => {
          if (!goals.includes(goal)) goals.push(goal)
     }

     const combined = `${userLower} ${replyLower}`

     // From stored profile goals (weight_loss, muscle_gain, energy, wellness, fitness, better_sleep, immunity)
     if (userProfile?.goals && Array.isArray(userProfile.goals)) {
          userProfile.goals.forEach((g) => {
               if (g === 'energy') addGoal('energy')
               if (g === 'better_sleep') addGoal('sleep')
               if (g === 'immunity') addGoal('immunity')
               if (g === 'weight_loss') addGoal('weight_loss')
               if (g === 'muscle_gain') addGoal('muscle_gain')
               if (g === 'fitness') addGoal('fitness')
               if (g === 'wellness') addGoal('wellness')
          })
     }

     // From current message / AI reply text
     if (/\b(énergie|energie|fatigue|coup de barre|manque d'énergie|manque d’energie|energy)\b/i.test(combined)) {
          addGoal('energy')
     }
     if (/\b(sommeil|dormir|insomnie|réveils nocturnes|reveils nocturnes|sleep)\b/i.test(combined)) {
          addGoal('sleep')
     }
     if (/\b(stress|anxiété|anxiete|angoisse|anxiety)\b/i.test(combined)) {
          addGoal('stress')
     }
     if (/\b(immunité|immunite|défenses|defenses|immune|immunity)\b/i.test(combined)) {
          addGoal('immunity')
     }
     if (/\b(digestion|digestif|ballonnements?|reflux|intestin|gut)\b/i.test(combined)) {
          addGoal('digestion')
     }
     if (/\b(coeur|cœur|cardio|heart)\b/i.test(combined)) {
          addGoal('heart')
     }

     return goals
}

/**
 * Structured view of what the user wants right now.
 * This is intentionally independent from "how we search Shopify".
 */
interface UserIntent {
     goal?: keyof typeof GOAL_TAGS
     secondaryGoals: Array<keyof typeof GOAL_TAGS>
     /** Budget range from the stored profile, if available */
     budget?: {
          min: number
          max: number
          currency: string
     }
     /** Dietary / lifestyle constraints inferred from allergies field */
     requireHalal: boolean
     requireVegetarian: boolean
     requireVegan: boolean
     avoidGluten: boolean
     avoidLactose: boolean
     /** True for interaction/safety/information questions where we normally avoid products */
     informationalQuestion: boolean
     /** User explicitly asked for a list of products */
     explicitProductRequest: boolean
     /** User mentions carences / deficiencies – we can be more proactive */
     deficiencyIntent: boolean
     /** Browsing promos / “en solde…” */
     saleRequest: boolean
     /** Explicit collection / univers requested (handle) */
     requestedCollection?: string
}

/**
 * Build a structured UserIntent from high-level signals (goals, profile, flags).
 * This is the single source of truth for "what the user wants" in the product layer.
 */
function buildUserIntent(params: {
     goalKeys: string[]
     userProfile: IUserProfile | null
     interactionIntent: boolean
     explicitProductRequest: boolean
     deficiencyIntent: boolean
     isSaleRequest: boolean
     requestedCollection?: string
}): UserIntent {
     const {
          goalKeys,
          userProfile,
          interactionIntent,
          explicitProductRequest,
          deficiencyIntent,
          isSaleRequest,
          requestedCollection
     } = params

     const normalizedGoals = goalKeys
          .filter((g) => g in GOAL_TAGS) as Array<keyof typeof GOAL_TAGS>
     const [primaryGoal, ...secondaryGoals] = normalizedGoals

     const allergies = (userProfile?.allergies || []).map(a => a.toLowerCase())

     const requireHalal = allergies.includes('halal')
     const requireVegetarian = allergies.includes('vegetarian')
     const requireVegan = allergies.includes('vegan')
     const avoidGluten = allergies.includes('gluten')
     const avoidLactose = allergies.includes('lactose')

     return {
          goal: primaryGoal,
          secondaryGoals,
          budget: userProfile?.budget
               ? {
                    min: userProfile.budget.min,
                    max: userProfile.budget.max,
                    currency: userProfile.budget.currency
               }
               : undefined,
          requireHalal,
          requireVegetarian,
          requireVegan,
          avoidGluten,
          avoidLactose,
          informationalQuestion: interactionIntent,
          explicitProductRequest,
          deficiencyIntent,
          saleRequest: isSaleRequest,
          requestedCollection
     }
}

/**
 * Deterministic, profile-aware filtering & sorting on top of any product list.
 * This layer is completely independent from how products were found (tags, text search, combos, etc.).
 */
function applyUserProfileFiltersToProducts(
     products: ProductSearchResult[],
     intent: UserIntent
): ProductSearchResult[] {
     if (!products.length) return products

     const filtered = products.filter((product) => {
          const tags = (product.tags || []).map(t => t.toLowerCase())

          // Dietary / lifestyle constraints – only enforce when we have explicit requirements
          if (intent.requireHalal && !tags.some(t => t.includes('halal'))) {
               return false
          }

          if (intent.requireVegan) {
               const isVegan = tags.some(t =>
                    t.includes('vegan') ||
                    t.includes('végétalien') ||
                    t.includes('vegetal')
               )
               if (!isVegan) return false
          } else if (intent.requireVegetarian) {
               const isVegetarian = tags.some(t =>
                    t.includes('vegetarian') ||
                    t.includes('végétarien') ||
                    t.includes('vege')
               )
               if (!isVegetarian) return false
          }

          // Simple allergy avoidance based on tags (best-effort)
          if (intent.avoidGluten) {
               const hasGlutenTag = tags.some(t =>
                    t.includes('gluten') &&
                    !t.includes('sans gluten') &&
                    !t.includes('gluten-free')
               )
               if (hasGlutenTag) return false
          }

          if (intent.avoidLactose) {
               const hasLactoseTag = tags.some(t =>
                    t.includes('lactose') &&
                    !t.includes('sans lactose') &&
                    !t.includes('lactose-free')
               )
               if (hasLactoseTag) return false
          }

          // Budget filter: only enforce when currency matches profile budget currency
          if (intent.budget && typeof product.price === 'number') {
               if (product.currency && product.currency !== intent.budget.currency) {
                    // Different currencies – skip strict budget check
                    return true
               }
               if (product.price < intent.budget.min || product.price > intent.budget.max) {
                    return false
               }
          }

          return true
     })

     // If all products were filtered out (e.g. missing tags), fall back to original list
     if (!filtered.length) {
          return products
     }

     // Optional: sort by proximity to budget mid-point when we have budget info
     if (intent.budget) {
          const mid = (intent.budget.min + intent.budget.max) / 2
          return [...filtered].sort((a, b) => {
               const priceA = typeof a.price === 'number' ? a.price : mid
               const priceB = typeof b.price === 'number' ? b.price : mid
               return Math.abs(priceA - mid) - Math.abs(priceB - mid)
          })
     }

     return filtered
}

/**
 * Perform background health check on AI providers (non-blocking)
 * This checks if providers are back online and resets cooldowns if they are
 * OPTIMIZED: Only checks providers that are actually in cooldown to reduce API calls
 * THROTTLED: Only performs health checks once every 10 minutes per provider to prevent API call storms
 */
function performBackgroundHealthCheck(userId?: string): void {
     // Use setImmediate to run after the response is sent
     setImmediate(async () => {
          try {
               // Only check health for providers that are actually in cooldown
               const openaiInCooldown = openaiService.isInCooldown()
               const geminiInCooldown = geminiService.isInCooldown()

               // If neither provider is in cooldown, skip health checks entirely
               if (!openaiInCooldown && !geminiInCooldown) {
                    return
               }

               // Check throttling before performing health checks
               const shouldCheckOpenAI = openaiInCooldown && shouldPerformHealthCheck('openai')
               const shouldCheckGemini = geminiInCooldown && shouldPerformHealthCheck('gemini')

               // If both are throttled, skip entirely
               if (!shouldCheckOpenAI && !shouldCheckGemini) {
                    console.log('[API] Health checks throttled - skipping to prevent excessive API calls')
                    return
               }

               console.log('[API] Starting background health check for providers in cooldown...')
               
               const healthChecks: Promise<{ provider: 'openai' | 'gemini'; healthy: boolean }>[] = []

               if (shouldCheckOpenAI) {
                    recordHealthCheck('openai')
                    healthChecks.push(
                         openaiService.checkHealth()
                              .then(healthy => ({ provider: 'openai' as const, healthy }))
                              .catch(() => ({ provider: 'openai' as const, healthy: false }))
                    )
               }

               if (shouldCheckGemini) {
                    recordHealthCheck('gemini')
                    healthChecks.push(
                         geminiService.checkHealth()
                              .then(healthy => ({ provider: 'gemini' as const, healthy }))
                              .catch(() => ({ provider: 'gemini' as const, healthy: false }))
                    )
               }

               // If no health checks were queued (all throttled), return early
               if (healthChecks.length === 0) {
                    return
               }

               const results = await Promise.allSettled(healthChecks)

               for (const result of results) {
                    if (result.status === 'fulfilled') {
                         const { provider, healthy } = result.value
                         if (healthy) {
                              console.log(`[API] ✅ ${provider} is back online - cooldown reset`)
                              try {
                                   await analytics.trackEvent('ai_provider_recovered', {
                                        category: 'ai',
                                        provider,
                                        userId: userId || 'anonymous'
                                   })
                              } catch {
                                   // Ignore analytics errors
                              }
                         } else {
                              console.log(`[API] ⚠️ ${provider} still in quota error - cooldown maintained`)
                         }
                    }
               }
          } catch (healthCheckError) {
               console.error('[API] Background health check error (non-fatal):', healthCheckError)
               // Don't throw - this is background work
          }
     })
}

/**
 * Create a fallback response when both AI providers fail
 */
function createFallbackResponse(userMessage: string, detectedLanguage: DetectedLanguage = 'fr'): StructuredNutritionResponse {
     const messageLower = userMessage.toLowerCase()
     
     // Language-specific fallback responses
     const fallbackMessages: Record<DetectedLanguage, {
          intro: string
          interactions: string
          deficiency: string
          products: string
          general: string
          disclaimer: string
     }> = {
          'fr': {
               intro: "😔 Oups ! Je rencontre actuellement un petit problème technique de mon côté. ",
               interactions: "Mais je peux quand même vous donner quelques conseils généraux sur les compléments à éviter ensemble :\n\n• **Fer et Calcium** : Ne pas prendre ensemble, car le calcium peut réduire l'absorption du fer.\n• **Fer et Zinc** : Prendre à des moments différents, car ils peuvent se concurrencer pour l'absorption.\n• **Calcium et Magnésium** : Peuvent être pris ensemble, mais en quantités équilibrées.\n• **Vitamine C et Fer** : La vitamine C améliore l'absorption du fer, donc c'est une bonne combinaison. ✨\n• **Vitamine D et Calcium** : Excellente combinaison pour la santé osseuse. 💪\n\n⚠️ **Important** : Consultez toujours un professionnel de la santé avant de combiner des suppléments, surtout si vous prenez des médicaments.",
               deficiency: "En attendant que je retrouve mes capacités, voici quelques signes à surveiller pour détecter une carence :\n\n• **Fatigue persistante** 😴 : Peut indiquer un manque de fer, vitamine D, ou vitamines B\n• **Crampes musculaires** 💪 : Souvent liées à un manque de magnésium ou potassium\n• **Mauvaise récupération** ⏱️ : Peut indiquer un déficit en magnésium ou vitamines B\n• **Baisse de performance** 📉 : Peut être liée à diverses carences\n\n💡 La meilleure façon de confirmer une carence est de faire une prise de sang prescrite par votre médecin.",
               products: "Je ne peux pas vous recommander de produits spécifiques pour le moment, mais ne vous inquiétez pas ! 😊 Je vous recommande de consulter notre catalogue de produits Vigaïa 🛍️ ou de contacter notre service client pour des recommandations personnalisées. Ils seront ravis de vous aider ! 💚",
               general: "Je ne peux pas traiter votre demande pour le moment, mais je travaille à résoudre ce problème ! 🔧 Veuillez réessayer dans quelques instants. Si le problème persiste, n'hésitez pas à contacter notre service client - ils sont là pour vous aider ! 💚",
               disclaimer: "💡 Cette réponse a été générée automatiquement en raison de difficultés techniques. Pour des conseils personnalisés, veuillez consulter un professionnel de la santé."
          },
          'en': {
               intro: "😔 Oops! I'm currently experiencing a small technical issue on my end. ",
               interactions: "But I can still give you some general advice on supplements to avoid together:\n\n• **Iron and Calcium**: Do not take together, as calcium can reduce iron absorption.\n• **Iron and Zinc**: Take at different times, as they can compete for absorption.\n• **Calcium and Magnesium**: Can be taken together, but in balanced amounts.\n• **Vitamin C and Iron**: Vitamin C improves iron absorption, so it's a good combination. ✨\n• **Vitamin D and Calcium**: Excellent combination for bone health. 💪\n\n⚠️ **Important**: Always consult a healthcare professional before combining supplements, especially if you're taking medications.",
               deficiency: "While I regain my capabilities, here are some signs to watch for to detect a deficiency:\n\n• **Persistent fatigue** 😴: May indicate a lack of iron, vitamin D, or B vitamins\n• **Muscle cramps** 💪: Often related to a lack of magnesium or potassium\n• **Poor recovery** ⏱️: May indicate a deficit in magnesium or B vitamins\n• **Performance decline** 📉: May be related to various deficiencies\n\n💡 The best way to confirm a deficiency is to have a blood test prescribed by your doctor.",
               products: "I can't recommend specific products at the moment, but don't worry! 😊 I recommend checking our Vigaïa product catalog 🛍️ or contacting our customer service for personalized recommendations. They'll be happy to help! 💚",
               general: "I can't process your request at the moment, but I'm working to resolve this issue! 🔧 Please try again in a few moments. If the problem persists, don't hesitate to contact our customer service - they're here to help! 💚",
               disclaimer: "💡 This response was automatically generated due to technical difficulties. For personalized advice, please consult a healthcare professional."
          },
          'es': {
               intro: "😔 ¡Ups! Actualmente estoy experimentando un pequeño problema técnico de mi parte. ",
               interactions: "Pero aún puedo darte algunos consejos generales sobre los suplementos que debes evitar juntos:\n\n• **Hierro y Calcio**: No tomar juntos, ya que el calcio puede reducir la absorción de hierro.\n• **Hierro y Zinc**: Tomar en momentos diferentes, ya que pueden competir por la absorción.\n• **Calcio y Magnesio**: Pueden tomarse juntos, pero en cantidades equilibradas.\n• **Vitamina C y Hierro**: La vitamina C mejora la absorción de hierro, por lo que es una buena combinación. ✨\n• **Vitamina D y Calcio**: Excelente combinación para la salud ósea. 💪\n\n⚠️ **Importante**: Siempre consulte a un profesional de la salud antes de combinar suplementos, especialmente si está tomando medicamentos.",
               deficiency: "Mientras recupero mis capacidades, aquí hay algunos signos a tener en cuenta para detectar una deficiencia:\n\n• **Fatiga persistente** 😴: Puede indicar falta de hierro, vitamina D o vitaminas B\n• **Calambres musculares** 💪: A menudo relacionados con falta de magnesio o potasio\n• **Mala recuperación** ⏱️: Puede indicar un déficit de magnesio o vitaminas B\n• **Disminución del rendimiento** 📉: Puede estar relacionada con varias deficiencias\n\n💡 La mejor manera de confirmar una deficiencia es hacerse un análisis de sangre prescrito por su médico.",
               products: "No puedo recomendar productos específicos en este momento, ¡pero no te preocupes! 😊 Te recomiendo consultar nuestro catálogo de productos Vigaïa 🛍️ o contactar a nuestro servicio al cliente para recomendaciones personalizadas. ¡Estarán encantados de ayudarte! 💚",
               general: "No puedo procesar tu solicitud en este momento, ¡pero estoy trabajando para resolver este problema! 🔧 Por favor, intenta de nuevo en unos momentos. Si el problema persiste, no dudes en contactar a nuestro servicio al cliente: ¡están aquí para ayudarte! 💚",
               disclaimer: "💡 Esta respuesta fue generada automáticamente debido a dificultades técnicas. Para consejos personalizados, consulte a un profesional de la salud."
          },
          'ar': {
               intro: "😔 عذراً! أواجه حالياً مشكلة تقنية صغيرة من جانبي. ",
               interactions: "لكن يمكنني مع ذلك أن أقدم لك بعض النصائح العامة حول المكملات التي يجب تجنبها معاً:\n\n• **الحديد والكالسيوم**: لا تأخذها معاً، لأن الكالسيوم يمكن أن يقلل من امتصاص الحديد.\n• **الحديد والزنك**: خذها في أوقات مختلفة، لأنها قد تتنافس على الامتصاص.\n• **الكالسيوم والمغنيسيوم**: يمكن أخذهما معاً، لكن بكميات متوازنة.\n• **فيتامين C والحديد**: فيتامين C يحسن امتصاص الحديد، لذا فهي مزيج جيد. ✨\n• **فيتامين D والكالسيوم**: مزيج ممتاز لصحة العظام. 💪\n\n⚠️ **مهم**: استشر دائماً أخصائي رعاية صحية قبل الجمع بين المكملات، خاصة إذا كنت تتناول أدوية.",
               deficiency: "بينما أستعيد قدراتي، إليك بعض العلامات التي يجب مراقبتها للكشف عن النقص:\n\n• **التعب المستمر** 😴: قد يشير إلى نقص الحديد أو فيتامين D أو فيتامينات B\n• **تشنجات العضلات** 💪: غالباً ما ترتبط بنقص المغنيسيوم أو البوتاسيوم\n• **ضعف التعافي** ⏱️: قد يشير إلى نقص في المغنيسيوم أو فيتامينات B\n• **انخفاض الأداء** 📉: قد يكون مرتبطاً بنواقص مختلفة\n\n💡 أفضل طريقة لتأكيد النقص هي إجراء فحص دم يصفه طبيبك.",
               products: "لا أستطيع أن أوصي بمنتجات محددة في الوقت الحالي، لكن لا تقلق! 😊 أنصحك بالاطلاع على كتالوج منتجات Vigaïa 🛍️ أو الاتصال بخدمة العملاء للحصول على توصيات مخصصة. سيكونون سعداء لمساعدتك! 💚",
               general: "لا أستطيع معالجة طلبك في الوقت الحالي، لكنني أعمل على حل هذه المشكلة! 🔧 يرجى المحاولة مرة أخرى بعد بضع لحظات. إذا استمرت المشكلة، لا تتردد في الاتصال بخدمة العملاء - إنهم هنا لمساعدتك! 💚",
               disclaimer: "💡 تم إنشاء هذه الإجابة تلقائياً بسبب صعوبات تقنية. للحصول على نصائح مخصصة، يرجى استشارة أخصائي رعاية صحية."
          }
     }
     
     const messages = fallbackMessages[detectedLanguage]
     let reply = messages.intro
     
     // Detect common question types and provide appropriate fallback responses
     // Use language-agnostic keywords for detection
     const hasInteractionKeywords = messageLower.includes('éviter') || messageLower.includes('eviter') || 
                                   messageLower.includes('interaction') || messageLower.includes('compatible') ||
                                   messageLower.includes('avoid') || messageLower.includes('together')
     const hasDeficiencyKeywords = messageLower.includes('carence') || messageLower.includes('manque') || 
                                   messageLower.includes('vitamine') || messageLower.includes('minéral') ||
                                   messageLower.includes('deficiency') || messageLower.includes('lack') ||
                                   messageLower.includes('deficiencia') || messageLower.includes('نقص')
     const hasProductKeywords = messageLower.includes('produit') || messageLower.includes('complément') || 
                               messageLower.includes('supplément') || messageLower.includes('product') ||
                               messageLower.includes('supplement') || messageLower.includes('complemento') ||
                               messageLower.includes('منتج') || messageLower.includes('مكمل')
     
     if (hasInteractionKeywords) {
          reply += messages.interactions
     } else if (hasDeficiencyKeywords) {
          reply += messages.deficiency
     } else if (hasProductKeywords) {
          reply += messages.products
     } else {
          reply += messages.general
     }
     
     return {
          reply,
          products: [],
          disclaimer: messages.disclaimer
     }
}

/**
 * Format user profile data into a context string for AI
 */
function formatUserProfileContext(userProfile: IUserProfile | null): string {
     if (!userProfile) {
          return ''
     }

     const contextParts: string[] = []
     
     // Basic info
     contextParts.push(`Âge: ${userProfile.age} ans`)
     contextParts.push(`Sexe: ${userProfile.gender === 'male' ? 'Homme' : userProfile.gender === 'female' ? 'Femme' : userProfile.gender}`)
     
     // Goals
     if (userProfile.goals && userProfile.goals.length > 0) {
          const goalsText = userProfile.goals.map(g => {
               // Translate common goal codes to French
               const goalMap: { [key: string]: string } = {
                    'weight_loss': 'Perte de poids',
                    'muscle_gain': 'Prise de masse musculaire',
                    'energy': 'Énergie',
                    'wellness': 'Bien-être général',
                    'fitness': 'Fitness',
                    'better_sleep': 'Amélioration du sommeil',
                    'immunity': 'Renforcement immunitaire'
               }
               return goalMap[g] || g
          }).join(', ')
          contextParts.push(`Objectifs: ${goalsText}`)
     }
     
     // Allergies
     if (userProfile.allergies && userProfile.allergies.length > 0) {
          const allergiesText = userProfile.allergies.map(a => {
               // Translate common allergy codes to French
               const allergyMap: { [key: string]: string } = {
                    'lactose': 'Lactose',
                    'gluten': 'Gluten',
                    'halal': 'Halal',
                    'vegetarian': 'Végétarien',
                    'vegan': 'Végétalien',
                    'nuts': 'Noix',
                    'peanuts': 'Arachides',
                    'shellfish': 'Fruits de mer',
                    'eggs': 'Œufs',
                    'soy': 'Soja'
               }
               return allergyMap[a] || a
          }).join(', ')
          contextParts.push(`Allergies/Régimes: ${allergiesText}`)
     } else {
          contextParts.push(`Allergies/Régimes: Aucune`)
     }
     
     // Budget
     if (userProfile.budget) {
          contextParts.push(`Budget mensuel: ${userProfile.budget.min}-${userProfile.budget.max} ${userProfile.budget.currency}`)
     }

     return contextParts.join('\n')
}

export async function POST(request: NextRequest) {
     try {
          const body = await request.json()
          const { message, userId, provider = 'gemini', conversationHistory } = body

          if (!message) {
               return NextResponse.json(
                    { error: 'Message is required' },
                    { status: 400 }
               )
          }

          // Rate limiting: use userId if available, otherwise use IP address
          const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                          request.headers.get('x-real-ip') || 
                          'unknown'
          const rateLimitId = userId || clientIp
          const rateLimit = checkRateLimit(rateLimitId)

          if (!rateLimit.allowed) {
               const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
               console.warn(`[API] Rate limit exceeded for ${rateLimitId}. Retry after ${retryAfter}s`)
               return NextResponse.json(
                    { 
                         error: 'Rate limit exceeded. Please wait before making another request.',
                         retryAfter 
                    },
                    { 
                         status: 429,
                         headers: {
                              'Retry-After': String(retryAfter),
                              'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
                              'X-RateLimit-Remaining': '0',
                              'X-RateLimit-Reset': String(rateLimit.resetAt)
                         }
                    }
               )
          }

          // Validate conversation history format if provided
          let validHistory: Array<{ role: 'user' | 'assistant'; content: string }> | undefined
          if (conversationHistory && Array.isArray(conversationHistory)) {
               validHistory = conversationHistory
                    .filter((msg: unknown): msg is { role: 'user' | 'assistant'; content: string } => {
                         if (!msg || typeof msg !== 'object') return false
                         const m = msg as { role?: unknown; content?: unknown }
                         return (m.role === 'user' || m.role === 'assistant') &&
                                typeof m.content === 'string'
                    })
                    .map((msg) => ({
                         role: msg.role,
                         content: msg.content
                    }))
                    .slice(-20) // Limit to last 20 messages to avoid token limits
          }

          // Track chat API request (with error handling)
          try {
               await analytics.trackEvent('chat_api_request', {
                    category: 'api',
                    messageLength: message.length,
                    userId: userId || 'anonymous',
                    provider: provider || 'gemini'
               })
          } catch (analyticsError) {
               console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
               // Continue execution even if analytics fails
          }

          // Fetch user profile if userId is provided
          let userProfile: IUserProfile | null = null
          let userProfileContext = ''
          
          if (userId) {
               try {
                    await dbService.connect()
                    userProfile = await dbService.getUserProfile(userId)
                    if (userProfile) {
                         userProfileContext = formatUserProfileContext(userProfile)
                         console.log('User profile context loaded:', userProfileContext)
                    }
               } catch (profileError) {
                    console.error('Error fetching user profile:', profileError)
                    // Continue without profile - non-fatal
               }
          }

          // Detect language from user message
          const detectedLanguage = detectLanguage(message)
          console.log(`[API] Detected language: ${detectedLanguage}`)

          // Select AI provider based on request or environment variable
          const selectedProvider = provider || process.env.AI_PROVIDER || 'openai'
          const fallbackProvider = selectedProvider === 'gemini' ? 'openai' : 'gemini'

          // Check if both providers are in cooldown - if so, skip directly to fallback response
          const openaiInCooldown = openaiService.isInCooldown()
          const geminiInCooldown = geminiService.isInCooldown()

          if (openaiInCooldown && geminiInCooldown) {
               const openaiRemaining = openaiService.getCooldownRemainingMs()
               const geminiRemaining = geminiService.getCooldownRemainingMs()
               console.warn(`[API] Both providers in cooldown - OpenAI: ${Math.ceil(openaiRemaining / 1000)}s, Gemini: ${Math.ceil(geminiRemaining / 1000)}s. Skipping to fallback response.`)
               
               // Track this scenario
               try {
                    await analytics.trackEvent('ai_both_providers_cooldown', {
                         category: 'error',
                         openaiCooldownMs: openaiRemaining,
                         geminiCooldownMs: geminiRemaining,
                         userId: userId || 'anonymous'
                    })
               } catch (analyticsError) {
                    console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
               }

               // Skip directly to fallback response
               const nutritionResponse = createFallbackResponse(message, detectedLanguage)
               
               const response = {
                    ...nutritionResponse,
                    recommendedProducts: [],
                    recommendedCombos: undefined,
                    suggestedCombo: undefined,
                    userId: userId || null,
                    provider: 'fallback',
                    timestamp: new Date().toISOString()
               }

               // Track fallback response
               try {
                    await analytics.trackEvent('chat_api_response', {
                         category: 'api',
                         hasProducts: false,
                         productCount: 0,
                         isInformationalQuestion: true,
                         responseLength: nutritionResponse.reply?.length || 0,
                         userId: userId || 'anonymous',
                         provider: 'fallback'
                    })
               } catch (analyticsError) {
                    console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
               }

               // Background health check: verify if APIs are back online (non-blocking)
               performBackgroundHealthCheck(userId)

               return NextResponse.json(response)
          }

          let nutritionResponse

          try {
               console.log(`[API] Attempting to generate advice with provider: ${selectedProvider}`)
               if (selectedProvider === 'gemini') {
                    nutritionResponse = await geminiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory, detectedLanguage)
               } else {
                    nutritionResponse = await openaiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory, detectedLanguage)
               }

               // Track successful AI response (with error handling)
               try {
                    await analytics.trackEvent('ai_response_generated', {
                         category: 'ai',
                         provider: selectedProvider,
                         responseLength: nutritionResponse.reply?.length || 0,
                         userId: userId || 'anonymous'
                    })
               } catch (analyticsError) {
                    console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
               }
          } catch (providerError) {
               console.error(`${selectedProvider} API error:`, providerError)

               // Track quota-specific errors separately for better observability
               if (providerError instanceof AIQuotaError) {
                    const quotaError = providerError as AIQuotaError
                    console.warn(`[API] ${quotaError.provider} quota/cooldown hit. retryAfterMs=${quotaError.retryAfterMs ?? 'unknown'}`)
                    try {
                         await analytics.trackEvent('ai_quota_exceeded', {
                              category: 'error',
                              provider: quotaError.provider,
                              retryAfterMs: quotaError.retryAfterMs ?? -1,
                              userId: userId || 'anonymous'
                         })
                    } catch (analyticsError) {
                         console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                    }
               }

               // Track AI provider error
               try {
                    await analytics.trackEvent('ai_provider_error', {
                         category: 'error',
                         provider: selectedProvider,
                         errorType: 'provider_failure',
                         userId: userId || 'anonymous'
                    })
               } catch (analyticsError) {
                    console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
               }

               // Fallback to the other provider if one fails
               console.log(`Falling back to ${fallbackProvider}`)
               
               // Check if fallback provider is also in cooldown before attempting
               const fallbackInCooldown = fallbackProvider === 'gemini' 
                    ? geminiService.isInCooldown()
                    : openaiService.isInCooldown()
               
               if (fallbackInCooldown) {
                    const remaining = fallbackProvider === 'gemini'
                         ? geminiService.getCooldownRemainingMs()
                         : openaiService.getCooldownRemainingMs()
                    console.warn(`[API] Fallback provider ${fallbackProvider} also in cooldown (${Math.ceil(remaining / 1000)}s remaining). Skipping to fallback response.`)
                    
                    // Skip directly to fallback response without attempting API call
                    nutritionResponse = createFallbackResponse(message, detectedLanguage)
                    
                    // Background health check: verify if APIs are back online (non-blocking)
                    performBackgroundHealthCheck(userId)
               } else {
                         try {
                         if (fallbackProvider === 'gemini') {
                              nutritionResponse = await geminiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory, detectedLanguage)
                         } else {
                              nutritionResponse = await openaiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory, detectedLanguage)
                         }

                         // Track successful fallback
                         try {
                              await analytics.trackEvent('ai_fallback_success', {
                                   category: 'ai',
                                   originalProvider: selectedProvider,
                                   fallbackProvider,
                                   userId: userId || 'anonymous'
                              })
                         } catch (analyticsError) {
                              console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                         }
                    } catch (fallbackError) {
                         console.error(`${fallbackProvider} fallback also failed:`, fallbackError)
                         console.error('Fallback error details:', {
                              message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                              stack: fallbackError instanceof Error ? fallbackError.stack : undefined
                         })

                         // Track quota-specific errors on fallback provider as well
                         if (fallbackError instanceof AIQuotaError) {
                              const quotaError = fallbackError as AIQuotaError
                              console.warn(`[API] Fallback provider ${quotaError.provider} quota/cooldown hit. retryAfterMs=${quotaError.retryAfterMs ?? 'unknown'}`)
                              try {
                                   await analytics.trackEvent('ai_quota_exceeded', {
                                        category: 'error',
                                        provider: quotaError.provider,
                                        retryAfterMs: quotaError.retryAfterMs ?? -1,
                                        userId: userId || 'anonymous'
                                   })
                              } catch (analyticsError) {
                                   console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                              }
                         }

                         // Track complete failure
                         try {
                              await analytics.trackEvent('ai_complete_failure', {
                                   category: 'error',
                                   originalProvider: selectedProvider,
                                   fallbackProvider,
                                   errorType: 'all_providers_failed',
                                   userId: userId || 'anonymous'
                              })
                         } catch (analyticsError) {
                              console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                         }

                         // Instead of throwing an error, provide a fallback response
                         console.warn('[API] Both AI providers failed, using fallback response')
                         nutritionResponse = createFallbackResponse(message, detectedLanguage)
                         
                         // Background health check: verify if APIs are back online (non-blocking)
                         performBackgroundHealthCheck(userId)
                    }
               }
          }

          // Validate that we have a valid nutrition response
          if (!nutritionResponse) {
               console.error('[API] nutritionResponse is null or undefined, using fallback')
               nutritionResponse = createFallbackResponse(message, detectedLanguage)
          }
          
          if (!nutritionResponse.reply) {
               console.error('[API] nutritionResponse.reply is missing:', {
                    hasResponse: !!nutritionResponse,
                    responseKeys: nutritionResponse ? Object.keys(nutritionResponse) : [],
                    responseType: typeof nutritionResponse
               })
               nutritionResponse = createFallbackResponse(message, detectedLanguage)
          }

          // Ensure products array exists
          if (!Array.isArray(nutritionResponse.products)) {
               console.warn('[API] nutritionResponse.products is not an array, setting to empty array')
               nutritionResponse.products = []
          }

          // Search for relevant products based on AI response and/or user intent
          // Only search if the AI explicitly indicates products should be recommended, or the user clearly asks for products
          let recommendedProducts: ProductSearchResult[] = []

          // Check if the AI explicitly recommends products
          // Only trigger if:
          // 1. AI returned products in the products array (explicit recommendation)
          // 2. OR the response contains explicit product recommendation language
          const replyLower = nutritionResponse.reply.toLowerCase()
          const userLower = (message || '').toLowerCase()
          const hasExplicitProducts = nutritionResponse.products.length > 0
          
          // More specific product recommendation triggers (avoid generic words like "recommand")
          const explicitProductTriggers = [
               'produit vigaïa',
               'produit recommandé',
               'je vous recommande',
               'je recommande',
               'voici des produits',
               'ces produits',
               'produits qui pourraient',
               'voici ma sélection',
               'ma sélection',
               'sélection de base',
               'compléments',
               'complément',
               'suppléments',
               'supplément',
               'voici',
               'sélection'
          ]
          
          const hasExplicitTrigger = explicitProductTriggers.some(trigger => 
               replyLower.includes(trigger)
          )
          
          // Also check for specific supplement mentions (not just generic "vitamine")
          const hasSpecificSupplement = replyLower.match(/\b(vitamine [a-z]|vitamine d|vitamine c|magnésium|oméga|probiotique|collagène|protéine|créatine|fer|zinc|calcium|mélatonine|melatonin)\b/i)

          // Detect user intent directly from the user's message
          // Include phrases that explicitly request product lists
          const productListPhrases = [
               'lister', 'liste', 'list', 
               'donner moi', 'donnez moi', 'donne moi', 'donnez-moi', 'donne-moi',
               'montre moi', 'montrez moi', 'montre-moi', 'montrez-moi',
               'produit', 'produits', 
               'recommande', 'recommander', 'recommandation', 'recommandations',
               'quel produit', 'quels produits',
               'aide moi', 'aidez moi', 'aide-moi', 'aidez-moi'
          ]
          const userHasProductIntent = productListPhrases.some(t => userLower.includes(t))
          const userHasSpecificSupplement = userLower.match(/\b(vitamine [a-z]|vitamine d|vitamine c|magnésium|oméga|probiotique|collagène|protéine|créatine|fer|zinc|calcium|mélatonine|melatonin)\b/i)

          // Derive high-level health goals (energy, sleep, stress, etc.) from profile + conversation
          const goalKeys = deriveGoalKeysFromContext(userProfile, userLower, replyLower)

          // Detect safety/interaction/informational questions where we should avoid suggesting products
          // These are questions asking for information, not product recommendations
          const informationalQuestionPatterns = [
               // Safety and interaction questions
               /\b(éviter|eviter|interactions?|ne\s+pas\s+prendre|combiner|prendre\s+ensemble|avoid|together|contraindications?)\b/i,
               // Questions about what to avoid
               /\b(quels?\s+compléments?\s+éviter|quels?\s+suppléments?\s+éviter|which\s+supplements?\s+to\s+avoid)\b/i,
               // Questions about compatibility
               /\b(compatible|incompatible|peut\s+on\s+prendre|peut-on\s+prendre|peuvent\s+ils|peuvent-ils)\b/i,
               // Questions about effects/interactions
               /\b(effets?\s+secondaires?|side\s+effects?|interactions?|réactions?)\b/i,
               // Questions asking "what" or "which" in informational context (not product requests)
               /\b(quels?\s+compléments?\s+(?:éviter|ne\s+pas|à\s+éviter|incompatibles?)|quels?\s+suppléments?\s+(?:éviter|ne\s+pas|à\s+éviter|incompatibles?))\b/i,
               // Questions about timing/scheduling
               /\b(quand\s+prendre|when\s+to\s+take|à\s+quelle\s+heure|timing|à\s+quel\s+moment)\b/i,
               // General information questions
               /\b(qu\'?est\s+ce\s+que|qu\'?est-ce\s+que|what\s+is|explique|explain|parle\s+moi|tell\s+me\s+about|comment\s+fonctionne)\b/i,
               // Questions about benefits/effects (informational, not product request)
               /\b(quels?\s+sont\s+les\s+bienfaits?|what\s+are\s+the\s+benefits?|à\s+quoi\s+sert|pourquoi|pour\s+quoi)\b/i,
               // Questions about spacing/timing between supplements
               /\b(espacer|séparer|espace|séparation|combien\s+de\s+temps|how\s+long\s+between)\b/i,
          ]
          
          const isInformationalQuestion = informationalQuestionPatterns.some(pattern => pattern.test(userLower))
          
          // Also check the AI reply for informational content indicators
          const replyInformationalPatterns = [
               /\b(éviter|eviter|ne\s+pas\s+combiner|incompatible|interactions?|contre-indications?)\b/i,
               /\b(il\s+est\s+important\s+de\s+éviter|it\s+is\s+important\s+to\s+avoid)\b/i,
               /\b(ne\s+prenez\s+pas|do\s+not\s+take)\b/i,
               /\b(espacer|séparer|compétition|bloque\s+l\'?action|absorption)\b/i,
               /\b(optimiser\s+l\'?absorption|maximiser\s+l\'?efficacité)\b/i,
               /\b(voici\s+les\s+paires|conseille\s+fortement\s+d\'?espacer)\b/i,
          ]
          const replyIsInformational = replyInformationalPatterns.some(pattern => pattern.test(replyLower))
          
          // Combined check: if user asks informational question OR AI gives informational answer
          const interactionIntent = isInformationalQuestion || replyIsInformational
          const deficiencyIntent = /\b(carence|manque de|deficiency|insuffisance)\b/i.test(userLower)
          
          if (interactionIntent) {
               console.log('[API] Detected informational/safety question - will not show products')
               console.log('[API] User question type:', isInformationalQuestion ? 'informational' : 'other')
               console.log('[API] AI reply type:', replyIsInformational ? 'informational' : 'other')
          }

          // Also consider supplement-related keywords in the AI reply
          const hasSupplementKeywords = extractSupplementKeywords(nutritionResponse.reply).length > 0

          // Detect sale/promotion requests
          const saleRequestPatterns = [
               /\b(promo|promotion|promos|promotions)\b/i,
               /\b(solde|soldes|en solde|en promotion)\b/i,
               /\b(réduction|reduction|réductions|reductions)\b/i,
               /\b(rabais|discount|discounts|remise|remises)\b/i,
               /\b(offre|offres|spécial|special|bon plan)\b/i,
               /\b(produits?\s+(?:en\s+)?solde|produits?\s+(?:en\s+)?promotion)\b/i,
          ]
          const isSaleRequest = saleRequestPatterns.some(pattern => 
               pattern.test(userLower) || pattern.test(replyLower)
          )
          
          if (isSaleRequest) {
               console.log('[API] Detected sale/promotion request from user')
          }

          // Detect combo/combination requests - when user asks about products that work together
          const comboRequestPatterns = [
               /\b(combiner|combinaison|combinations?|ensemble|together)\b/i,
               /\b(quels?\s+produits?\s+(?:peuvent|peuvent-ils|doivent)\s+(?:être\s+)?(?:pris|utilisés?|associés?)\s+ensemble)\b/i,
               /\b(quels?\s+compléments?\s+(?:peuvent|peuvent-ils|doivent)\s+(?:être\s+)?(?:pris|utilisés?|associés?)\s+ensemble)\b/i,
               /\b(quels?\s+suppléments?\s+(?:peuvent|peuvent-ils|doivent)\s+(?:être\s+)?(?:pris|utilisés?|associés?)\s+ensemble)\b/i,
               /\b(produits?\s+qui\s+(?:fonctionnent|marchent|vont)\s+bien\s+ensemble)\b/i,
               /\b(compléments?\s+qui\s+(?:fonctionnent|marchent|vont)\s+bien\s+ensemble)\b/i,
               /\b(suppléments?\s+qui\s+(?:fonctionnent|marchent|vont)\s+bien\s+ensemble)\b/i,
               /\b(meilleur\s+(?:combinaison|stack|pack))\b/i,
               /\b(quelle\s+combinaison|quelles?\s+combinaisons?)\b/i,
               /\b(work\s+together|go\s+well\s+together|best\s+combination)\b/i,
          ]
          const isComboRequest = comboRequestPatterns.some(pattern => 
               pattern.test(userLower) || pattern.test(replyLower)
          )
          
          if (isComboRequest) {
               console.log('[API] Detected combo/combination request from user')
          }

          // Detect collection requests (live map with static fallback)
          let requestedCollection: string | undefined = undefined
          let collectionMap = COLLECTION_MAP
          try {
               collectionMap = await getCollectionMap()
          } catch (err) {
               console.error('[API] Failed to load live collection map, using static map', err)
               collectionMap = COLLECTION_MAP
          }

          const collectionKeywords = Object.keys(collectionMap)
          for (const collectionHandle of collectionKeywords) {
               const collectionTerms = collectionMap[collectionHandle]
               const hasCollectionTerm = collectionTerms.some(term => {
                    const regex = new RegExp(`\\b${term}\\b`, 'i')
                    return regex.test(userLower) || regex.test(replyLower)
               })
               
               // Also check for explicit collection mentions
               const collectionMentionPatterns = [
                    new RegExp(`\\bcollection\\s+${collectionHandle.replace(/-/g, '[-\\s]')}\\b`, 'i'),
                    new RegExp(`\\bcatégorie\\s+${collectionHandle.replace(/-/g, '[-\\s]')}\\b`, 'i'),
                    new RegExp(`\\b(univers|gamme)\\s+${collectionHandle.replace(/-/g, '[-\\s]')}\\b`, 'i'),
               ]
               const hasExplicitCollectionMention = collectionMentionPatterns.some(pattern =>
                    pattern.test(userLower) || pattern.test(replyLower)
               )
               
               if (hasCollectionTerm || hasExplicitCollectionMention) {
                    requestedCollection = collectionHandle
                    console.log(`[API] Detected collection request: ${collectionHandle}`)
                    break
               }
          }

          // Search if:
          // - AI explicitly returned products, OR
          // - AI reply explicitly recommends products (even without specific supplement mention), OR
          // - AI reply mentions supplements/complements, OR
          // - User explicitly asked for products and mentioned specific supplement(s) or we detect supplement keywords
          const hasSupplementMentions = replyLower.includes('complément') || 
                                        replyLower.includes('supplément') || 
                                        replyLower.includes('compléments') ||
                                        replyLower.includes('suppléments') ||
                                        hasSupplementKeywords ||
                                        hasSpecificSupplement
          
          // Decide whether we should search for products.
          // CRITICAL: If this is an informational/safety question, NEVER show products
          // unless the user explicitly asks for products in a non-informational context.
          // Par exemple : "Quels compléments éviter de prendre ensemble ?" = question
          // d'interactions -> réponse purement pédagogique, sans produits.
          
          // Check if user explicitly asks for products in a way that's NOT informational
          // This means they want a product list, not information about what to avoid
          const explicitProductRequest = userHasProductIntent && 
               !isInformationalQuestion && 
               (userLower.includes('liste') || userLower.includes('lister') || 
                userLower.includes('donner') || userLower.includes('montrer') ||
                userLower.includes('recommand'))

          // Only allow product search if:
          // 1. It's NOT an informational question, OR
          // 2. User explicitly requests products (not just asking about supplements), OR
          // 3. User expresses deficiency intent (carences/manque)
          const allowProductSearch = !interactionIntent || explicitProductRequest || deficiencyIntent

          // Sale requests, collection requests, and combo requests should always trigger product search
          const isProductRequest = isSaleRequest || requestedCollection !== undefined || isComboRequest
          
          const shouldSearchProducts = allowProductSearch && !!(
               hasExplicitProducts ||
               (hasExplicitTrigger && hasSupplementMentions && !interactionIntent) ||
               (hasExplicitTrigger && replyLower.includes('sélection') && !interactionIntent) ||
               explicitProductRequest ||
               isProductRequest || // Sale, collection, or combo requests trigger search
               (userHasSpecificSupplement && !interactionIntent && userHasProductIntent) ||
               (hasSpecificSupplement && !interactionIntent && hasExplicitTrigger) ||
               (hasSupplementKeywords && !interactionIntent && hasExplicitTrigger) ||
               (hasSupplementMentions && !interactionIntent && (replyLower.includes('voici') || replyLower.includes('sélection'))) ||
               deficiencyIntent ||
               // If we detect a health goal (sleep, energy, stress, etc.) AND the AI mentions supplements,
               // automatically trigger product search - this handles cases where user mentions a health problem
               // and AI recommends supplements without using explicit trigger words
               (goalKeys.length > 0 && (hasSpecificSupplement || hasSupplementKeywords || hasSupplementMentions) && !interactionIntent)
          )

          console.log('[API] Product search gating', {
               interactionIntent,
               explicitProductRequest,
               deficiencyIntent,
               hasSupplementMentions,
               hasSupplementKeywords,
               hasSpecificSupplement,
               hasExplicitTrigger,
               hasExplicitProducts,
               userHasSpecificSupplement,
               userHasProductIntent,
               shouldSearchProducts,
               goalKeys
          })

          // Build a structured intent that summarizes what the user wants for the
          // merchandising layer (goals, budget, dietary constraints, browsing mode).
          const intent: UserIntent = buildUserIntent({
               goalKeys,
               userProfile,
               interactionIntent,
               explicitProductRequest,
               deficiencyIntent,
               isSaleRequest,
               requestedCollection
          })

          if (shouldSearchProducts) {
               try {
                    // 1) Goal-based, tag-driven search (preferred when a clear goal is identified)
                    if (goalKeys.length > 0 && !isSaleRequest && !requestedCollection) {
                         console.log('[API] Attempting goal-based product search using tags for goals:', goalKeys)
                         try {
                              // Track goal-based search attempt
                              try {
                                   await analytics.trackEvent('product_search_initiated', {
                                        category: 'ecommerce',
                                        searchMode: 'tags',
                                        goalKeys: goalKeys.join(', '),
                                        userId: userId || 'anonymous'
                                   })
                              } catch (analyticsError) {
                                   console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                              }

                              for (const goal of goalKeys) {
                                   const tagsForGoal = GOAL_TAGS[goal]
                                   if (!tagsForGoal || tagsForGoal.length === 0) continue

                                   console.log(`[API] Searching products by tags for goal "${goal}" -> [${tagsForGoal.join(', ')}]`)
                                   try {
                                        const goalProducts = await searchProductsByTags(tagsForGoal, 4)
                                        if (goalProducts && goalProducts.length > 0) {
                                             goalProducts.forEach((p) => {
                                                  if (!recommendedProducts.some(rp => rp.variantId === p.variantId)) {
                                                       recommendedProducts.push(p)
                                                  }
                                             })
                                        }
                                   } catch (tagSearchError) {
                                        console.error(`[API] Error searching products by tags for goal "${goal}":`, tagSearchError)
                                   }

                                   // If we already have a few strong matches, stop early
                                   if (recommendedProducts.length >= 3) {
                                        break
                                   }
                              }

                              if (recommendedProducts.length > 0) {
                                   console.log('[API] Goal-based tag search produced products:', {
                                        goals: goalKeys,
                                        productTitles: recommendedProducts.map(p => p.title)
                                   })

                                   // Track successful goal-based search
                                   try {
                                        await analytics.trackEvent('product_search_completed', {
                                             category: 'ecommerce',
                                             searchMode: 'tags',
                                             goals: goalKeys.join(', '),
                                             productCount: recommendedProducts.length,
                                             userId: userId || 'anonymous'
                                        })
                                   } catch (analyticsError) {
                                        console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                                   }

                                   // Track individual product recommendations
                                   recommendedProducts.forEach((product) => {
                                        try {
                                             analytics.trackProductRecommended(
                                                  product.title,
                                                  product.variantId,
                                                  userId || 'anonymous',
                                                  'ai_generated'
                                             )
                                        } catch (analyticsError) {
                                             console.error('[API] Analytics tracking error for product (non-fatal):', analyticsError)
                                        }
                                   })
                              }
                         } catch (goalSearchError) {
                              console.error('[API] Goal-based product search error:', goalSearchError)
                         }
                    }

                    // 2) If goal-based tag search didn't find anything, fall back to keyword-based search
                    if (recommendedProducts.length === 0) {
                         // Start with queries derived from the AI reply
                         let searchQueries = generateProductSearchQueries(nutritionResponse.reply)

                    // If none, try deriving from the user's original message
                    if (searchQueries.length === 0) {
                         const userDerived = generateProductSearchQueries(userLower)
                         if (userDerived.length > 0) {
                              searchQueries = userDerived
                         }
                    }

                    // If still empty, map common intents to concrete supplement search terms
                    if (searchQueries.length === 0) {
                         const intentToKeywords: Array<{ test: (s: string) => boolean; keywords: string[] }> = [
                              // Weight gain / Muscle gain
                              { test: s => /\b(prise de poids|gain de poids|prise de masse|gain de masse|muscle|musculation|bodybuilding|masse musculaire)\b/i.test(s), keywords: ['protein', 'creatine', 'bcaa'] },
                              // Weight loss
                              { test: s => /\b(perte de poids|maigrir|minceur|weight ?loss)\b/i.test(s), keywords: ['protein', 'magnesium', 'collagen'] },
                              // Sleep
                              { test: s => /\b(sommeil|dormir|insomnie|sleep)\b/i.test(s), keywords: ['melatonin', 'magnesium', 'ashwagandha'] },
                              // Stress/anxiety
                              { test: s => /\b(stress|anxiété|anxiete|anxiety)\b/i.test(s), keywords: ['ashwagandha', 'magnesium', 'omega'] },
                              // Energy
                              { test: s => /\b(énergie|energie|fatigue|energy)\b/i.test(s), keywords: ['b-complex', 'iron', 'coq10'] },
                              // Immunity
                              { test: s => /\b(immunité|immunite|immune)\b/i.test(s), keywords: ['vitamin c', 'zinc', 'vitamin d'] },
                         ]

                         // Check both user message and AI reply for intents
                         const combinedText = `${userLower} ${replyLower}`
                         for (const mapper of intentToKeywords) {
                              if (mapper.test(combinedText)) {
                                   searchQueries = mapper.keywords.slice(0, 3)
                                   console.log('Mapped intent to keywords:', mapper.keywords)
                                   break
                              }
                         }
                    }
                    console.log('Searching for products with queries:', searchQueries)

                         // If queries are too generic (complément/supplément) and this is a deficiency intent,
                         // replace them with concrete deficiency-safe defaults to surface real products.
                         if (deficiencyIntent) {
                              const genericPattern = /\b(compl[eé]ment|suppl[eé]ment)s?\b/i
                              const filtered = searchQueries.filter(q => !genericPattern.test(q))
                              if (filtered.length > 0) {
                                   searchQueries = filtered
                              } else {
                                   searchQueries = ['multivitamin', 'vitamin d', 'magnesium', 'iron', 'zinc']
                              }
                              console.log('Applying deficiency fallback queries:', searchQueries)
                         }

                         // If user asks for sales or collection but no specific query, use better search terms
                         if (searchQueries.length === 0 && (isSaleRequest || requestedCollection)) {
                              if (requestedCollection) {
                                   // Use collection-specific terms
                                   const collectionTerms = collectionMap[requestedCollection]
                                   if (collectionTerms && collectionTerms.length > 0) {
                                        searchQueries = [collectionTerms[0]]
                                   } else {
                                        // Try to extract from collection handle
                                        const handleWords = requestedCollection.split('-')
                                        searchQueries = handleWords.length > 0 ? [handleWords[0]] : ['vitamin']
                                   }
                              } else if (isSaleRequest) {
                                   // For sale requests, use broader terms that will match products on sale
                                   // Try to extract intent from user message or AI reply
                                   if (userLower.includes('énergie') || userLower.includes('energie') || replyLower.includes('énergie') || replyLower.includes('energie')) {
                                        searchQueries = ['energie']
                                   } else if (userLower.includes('beauté') || userLower.includes('beaute') || replyLower.includes('beauté') || replyLower.includes('beaute')) {
                                        searchQueries = ['collagen']
                                   } else if (userLower.includes('sport') || replyLower.includes('sport')) {
                                        searchQueries = ['protein']
                                   } else {
                                        // Default to terms that will match products we know are on sale
                                        searchQueries = ['multivitamin', 'vitamin', 'ashwagandha']
                                   }
                              }
                         }

                         // Only search if we have valid search queries; as a last resort, extract from AI products
                         if (searchQueries.length === 0 && hasExplicitProducts) {
                              // Extract keywords from AI's product recommendations
                              const productKeywords = nutritionResponse.products
                                   .map(p => (p.name || '').toLowerCase())
                                   .filter(name => name.length > 0)
                              if (productKeywords.length > 0) {
                                   searchQueries = [...new Set(productKeywords)].slice(0, 3)
                                   console.log('Extracted search queries from products:', searchQueries)
                              }
                         }

                         // Track product search attempt (with error handling)
                         try {
                              await analytics.trackEvent('product_search_initiated', {
                                   category: 'ecommerce',
                                   searchMode: 'keywords',
                                   searchQueries: searchQueries.join(', '),
                                   queryCount: searchQueries.length,
                                   userId: userId || 'anonymous'
                              })
                         } catch (analyticsError) {
                              console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                         }

                         // Search for products using the first query (most relevant)
                         // Using live Shopify Storefront API data
                         if (searchQueries.length > 0) {
                              const searchOptions = {
                                   useTagRanking: true,
                                   onlyOnSale: isSaleRequest,
                                   collection: requestedCollection,
                              }
                              
                              console.log(`[API] Searching for products with query: "${searchQueries[0]}"`, searchOptions)
                              try {
                                   // Use tag-enhanced search with sale/collection options
                                   recommendedProducts = await searchProducts(searchQueries[0], searchOptions)
                                   console.log(`[API] Found ${recommendedProducts.length} products for query: "${searchQueries[0]}"`)
                                   
                                   // If sale request and we don't have enough products, try other queries
                                   if (isSaleRequest && recommendedProducts.length < 3 && searchQueries.length > 1) {
                                        for (let i = 1; i < searchQueries.length && recommendedProducts.length < 3; i++) {
                                             try {
                                                  const additionalProducts = await searchProducts(searchQueries[i], searchOptions)
                                                  // Add products that aren't already in the list
                                                  for (const product of additionalProducts) {
                                                       if (!recommendedProducts.some(p => p.variantId === product.variantId)) {
                                                            recommendedProducts.push(product)
                                                            if (recommendedProducts.length >= 3) break
                                                       }
                                                  }
                                                  console.log(`[API] Added products from query "${searchQueries[i]}", total: ${recommendedProducts.length}`)
                                             } catch (err) {
                                                  console.error(`[API] Error searching with query "${searchQueries[i]}":`, err)
                                             }
                                        }
                                   }
                                   
                                   if (recommendedProducts.length > 0) {
                                        console.log(`[API] Product titles: ${recommendedProducts.map(p => p.title).join(', ')}`)
                                        if (isSaleRequest) {
                                             console.log(`[API] Products on sale: ${recommendedProducts.filter(p => p.isOnSale).length}`)
                                        }
                                        // Log tags and collections if available (for debugging)
                                        recommendedProducts.forEach((p, idx) => {
                                             if (p.tags && p.tags.length > 0) {
                                                  console.log(`[API] Product ${idx + 1} tags: ${p.tags.join(', ')}`)
                                             }
                                             if (p.collections && p.collections.length > 0) {
                                                  console.log(`[API] Product ${idx + 1} collections: ${p.collections.join(', ')}`)
                                             }
                                        })
                                   }
                              } catch (searchError) {
                                   console.error(`[API] Error searching products for query "${searchQueries[0]}":`, searchError)
                                   // Continue without products rather than failing the entire request
                                   recommendedProducts = []
                              }

                              // If we found products, also search for complementary products
                              if (recommendedProducts.length > 0) {
                                   // Search for complementary products (e.g., if main product is vitamin D, search for magnesium or K2)
                                   const complementaryQueries = generateComplementaryQueries(searchQueries[0], recommendedProducts[0])
                                   if (complementaryQueries.length > 0) {
                                        try {
                                             // Use tag-enhanced search for complementary products (skip sale/collection filters)
                                             const complementaryProducts = await searchProducts(complementaryQueries[0], { useTagRanking: true })
                                             // Add complementary products (limit to 2-3 additional)
                                             recommendedProducts = [
                                                  ...recommendedProducts,
                                                  ...complementaryProducts.slice(0, 2).filter(
                                                       (p) => !recommendedProducts.some((rp) => rp.variantId === p.variantId)
                                                  )
                                             ]
                                        } catch {
                                             // Non-fatal, continue with main products
                                             console.log('Complementary product search skipped')
                                        }
                                   }
                              }

                              // Track successful product search (with error handling)
                              try {
                                   await analytics.trackEvent('product_search_completed', {
                                        category: 'ecommerce',
                                        searchMode: 'keywords',
                                        searchQuery: searchQueries[0],
                                        productCount: recommendedProducts.length,
                                        userId: userId || 'anonymous'
                                   })
                              } catch (analyticsError) {
                                   console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                              }

                              // Track individual product recommendations (with error handling)
                              recommendedProducts.forEach((product) => {
                                   try {
                                        analytics.trackProductRecommended(
                                             product.title,
                                             product.variantId,
                                             userId || 'anonymous',
                                             'ai_generated'
                                        )
                                   } catch (analyticsError) {
                                        console.error('[API] Analytics tracking error for product (non-fatal):', analyticsError)
                                   }
                              })
                         }
                    }
               } catch (productSearchError) {
                    console.error('Product search error:', productSearchError)

                    // Track product search error (with error handling)
                    try {
                         await analytics.trackEvent('product_search_error', {
                              category: 'error',
                              errorType: 'search_failure',
                              userId: userId || 'anonymous'
                         })
                    } catch (analyticsError) {
                         console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
                    }

                    // Continue without products if search fails
               }
          } else {
               console.log('No product search needed - AI response indicates no products required')
          }

          // Apply deterministic, profile-based filtering & sorting on the
          // candidate products, independent of how they were found.
          if (recommendedProducts.length > 0) {
               recommendedProducts = applyUserProfileFiltersToProducts(recommendedProducts, intent)
          }

          // Get recommended product combinations based on user profile
          // Skip combos if this is an informational question (no products should be shown)
          let recommendedCombos: Array<{
               name: string;
               description: string;
               products: ProductSearchResult[];
               benefits: string;
          }> = []

          // Find matching combo based on recommended products (for interactive suggestion)
          let suggestedCombo: {
               name: string;
               description: string;
               products: ProductSearchResult[];
               benefits: string;
          } | null = null

          // Generate combos if:
          // 1. User explicitly asks about combinations (isComboRequest), OR
          // 2. We have products AND user profile (profile-based), OR
          // 3. We have products AND detected goals from conversation (conversation-based)
          // Skip combos if this is an informational question (no products should be shown)
          if (allowProductSearch && (isComboRequest || recommendedProducts.length > 0)) {
               try {
                    // Determine goals from profile OR conversation context
                    const comboGoals = userProfile?.goals || goalKeys
                    const comboAge = userProfile?.age
                    const comboGender = userProfile?.gender

                    // If user explicitly asks about combos, prioritize showing combos
                    // Use conversation-derived goals if no profile available
                    let combos = getRecommendedCombos(
                         comboGoals,
                         comboAge,
                         comboGender
                    )

                    // If no combos found but user asked about combinations, show general combos
                    if (isComboRequest && combos.length === 0) {
                         // Get all available combos as fallback when user explicitly asks
                         combos = PRODUCT_COMBOS.slice(0, 3) // Show top 3 general combos
                         console.log('[API] User asked about combos but no profile/goals - showing general combos')
                    }

                    // Convert combos to include actual product data and apply the same
                    // profile-based filtering (budget, halal/vegan, etc.).
                    const combosWithProducts = await Promise.all(
                         combos.map(async (combo) => {
                              const rawProducts = await getComboProducts(combo)
                              console.log(`[API] Combo "${combo.name}" resolved products: ${rawProducts.map(p => p.title).join(', ') || 'none'}`)
                              const products = applyUserProfileFiltersToProducts(rawProducts, intent)
                              return {
                                   name: combo.name,
                                   description: combo.description,
                                   products,
                                   benefits: combo.benefits
                              }
                         })
                    )

                    recommendedCombos = combosWithProducts.filter(combo => combo.products.length > 0) // Only include combos with available products

                    console.log('Recommended combos:', recommendedCombos.length)
                    if (recommendedCombos.length > 0) {
                         console.log('[API] Combo names:', recommendedCombos.map(c => c.name).join(', '))
                    }

                    // Find a combo that matches the recommended products (for interactive prompt)
                    // Prioritize this if user asked about combinations
                    if (recommendedProducts.length > 0) {
                         const matchingCombo = findMatchingCombo(recommendedProducts)
                         if (matchingCombo) {
                              const comboProducts = await getComboProducts(matchingCombo)
                              if (comboProducts.length > 0) {
                                   suggestedCombo = {
                                        name: matchingCombo.name,
                                        description: matchingCombo.description,
                                        products: comboProducts,
                                        benefits: matchingCombo.benefits
                                   }
                                   console.log('Found matching combo for interactive suggestion:', suggestedCombo.name)
                                   console.log(`[API] Suggested combo products: ${comboProducts.map(p => p.title).join(', ')}`)
                              }
                         }
                    }

                    // If user explicitly asked about combos but we don't have a matching combo,
                    // prioritize showing the first available combo
                    if (isComboRequest && !suggestedCombo && recommendedCombos.length > 0) {
                         suggestedCombo = recommendedCombos[0]
                         console.log('[API] User asked about combos - showing first available combo:', suggestedCombo.name)
                    }
               } catch (comboError) {
                    console.error('Error getting recommended combos:', comboError)
                    // Non-fatal, continue without combos
               }
          }

          // If user intent is about interactions/safety/information and they didn't explicitly request products,
          // strip any model-provided products/combos to avoid irrelevant suggestions.
          // This ensures questions like "Quels compléments éviter" don't show products
          const sanitizedResponse = interactionIntent && !explicitProductRequest
               ? {
                    ...nutritionResponse,
                    products: [],
                    recommendedProducts: [],
                    recommendedCombos: undefined,
                    suggestedCombo: undefined,
               }
               : nutritionResponse

          // Also clear recommendedProducts if this is an informational question
          const finalRecommendedProducts = (interactionIntent && !explicitProductRequest) 
               ? [] 
               : recommendedProducts
          
          const finalRecommendedCombos = (interactionIntent && !explicitProductRequest)
               ? []
               : (recommendedCombos.length > 0 ? recommendedCombos : undefined)
          
          const finalSuggestedCombo = (interactionIntent && !explicitProductRequest)
               ? undefined
               : (suggestedCombo || undefined)

          const response = {
               ...sanitizedResponse,
               recommendedProducts: finalRecommendedProducts,
               recommendedCombos: finalRecommendedCombos,
               suggestedCombo: finalSuggestedCombo,
               /**
                * Structured summary of what the user is asking for RIGHT NOW.
                * This is intentionally separate from the raw AI reply and from
                * how we actually queried Shopify. It is safe to use on the
                * frontend (for debugging, analytics, or UI hints).
                */
               intent: {
                    goal: intent.goal ?? null,
                    secondaryGoals: intent.secondaryGoals,
                    budget: intent.budget ?? null,
                    halal: intent.requireHalal,
                    vegetarian: intent.requireVegetarian,
                    vegan: intent.requireVegan,
                    avoidGluten: intent.avoidGluten,
                    avoidLactose: intent.avoidLactose,
                    informationalQuestion: intent.informationalQuestion,
                    explicitProductRequest: intent.explicitProductRequest,
                    deficiencyIntent: intent.deficiencyIntent,
                    saleRequest: intent.saleRequest,
                    requestedCollection: intent.requestedCollection ?? null
               },
               userId: userId || null,
               provider: selectedProvider,
               timestamp: new Date().toISOString()
          }

          // Log response summary for debugging
          console.log(`[API] Response summary - Products: ${finalRecommendedProducts.length}, Combos: ${finalRecommendedCombos?.length || 0}, HasSuggestedCombo: ${!!finalSuggestedCombo}, IsInformational: ${interactionIntent}`)

          // Track successful API response (with error handling)
          try {
               await analytics.trackEvent('chat_api_response', {
                    category: 'api',
                    hasProducts: finalRecommendedProducts.length > 0,
                    productCount: finalRecommendedProducts.length,
                    isInformationalQuestion: interactionIntent,
                    responseLength: nutritionResponse.reply?.length || 0,
                    userId: userId || 'anonymous',
                    provider: selectedProvider
               })
          } catch (analyticsError) {
               console.error('[API] Analytics tracking error (non-fatal):', analyticsError)
          }

          return NextResponse.json(response)
     } catch (error) {
          console.error('Chat API error:', error)

          // Track API error (with error handling to prevent double errors)
          try {
               await analytics.trackEvent('chat_api_error', {
                    category: 'error',
                    errorType: 'internal_server_error',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    userId: 'unknown'
               })
          } catch (analyticsError) {
               console.error('[API] Analytics tracking error during error handling (non-fatal):', analyticsError)
          }

          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          )
     }
}

export async function GET() {
     return NextResponse.json(
          { message: 'Chat API is running' },
          { status: 200 }
     )
}
