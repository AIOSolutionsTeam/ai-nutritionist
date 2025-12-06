import { NextRequest, NextResponse } from 'next/server'
import { openaiService, geminiService } from '../../../lib/openai'
import { searchProducts, ProductSearchResult, getRecommendedCombos, getComboProducts, findMatchingCombo } from '../../../lib/shopify'
import { analytics } from '../../../utils/analytics'
import { dbService, IUserProfile } from '../../../lib/db'

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

     // Only return keywords if we found specific supplement keywords
     // DO NOT fallback to generic terms - this prevents unwanted product searches
     if (keywords.length > 0) {
          return keywords.slice(0, 3) // Limit to top 3 keywords
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

          // Track chat API request
          analytics.trackEvent('chat_api_request', {
               category: 'api',
               messageLength: message.length,
               userId: userId || 'anonymous',
               provider: provider || 'gemini'
          })

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

          // Select AI provider based on request or environment variable
          const selectedProvider = provider || process.env.AI_PROVIDER || 'openai'

          let nutritionResponse

          try {
               if (selectedProvider === 'gemini') {
                    nutritionResponse = await geminiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory)
               } else {
                    nutritionResponse = await openaiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory)
               }

               // Track successful AI response
               analytics.trackEvent('ai_response_generated', {
                    category: 'ai',
                    provider: selectedProvider,
                    responseLength: nutritionResponse.reply?.length || 0,
                    userId: userId || 'anonymous'
               })
          } catch (providerError) {
               console.error(`${selectedProvider} API error:`, providerError)

               // Track AI provider error
               analytics.trackEvent('ai_provider_error', {
                    category: 'error',
                    provider: selectedProvider,
                    errorType: 'provider_failure',
                    userId: userId || 'anonymous'
               })

               // Fallback to the other provider if one fails
               const fallbackProvider = selectedProvider === 'gemini' ? 'openai' : 'gemini'
               console.log(`Falling back to ${fallbackProvider}`)

               try {
                    if (fallbackProvider === 'gemini') {
                         nutritionResponse = await geminiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory)
                    } else {
                         nutritionResponse = await openaiService.generateNutritionAdvice(message, userId, userProfileContext, validHistory)
                    }

                    // Track successful fallback
                    analytics.trackEvent('ai_fallback_success', {
                         category: 'ai',
                         originalProvider: selectedProvider,
                         fallbackProvider,
                         userId: userId || 'anonymous'
                    })
               } catch (fallbackError) {
                    console.error(`${fallbackProvider} fallback also failed:`, fallbackError)

                    // Track complete failure
                    analytics.trackEvent('ai_complete_failure', {
                         category: 'error',
                         originalProvider: selectedProvider,
                         fallbackProvider,
                         errorType: 'all_providers_failed',
                         userId: userId || 'anonymous'
                    })

                    throw new Error('Both AI providers failed')
               }
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
               /\b(quand\s+prendre|when\s+to\s+take|à\s+quelle\s+heure|timing)\b/i,
               // General information questions
               /\b(qu\'?est\s+ce\s+que|qu\'?est-ce\s+que|what\s+is|explique|explain|parle\s+moi|tell\s+me\s+about)\b/i,
               // Questions about benefits/effects (informational, not product request)
               /\b(quels?\s+sont\s+les\s+bienfaits?|what\s+are\s+the\s+benefits?|à\s+quoi\s+sert)\b/i,
          ]
          
          const isInformationalQuestion = informationalQuestionPatterns.some(pattern => pattern.test(userLower))
          
          // Also check the AI reply for informational content indicators
          const replyInformationalPatterns = [
               /\b(éviter|eviter|ne\s+pas\s+combiner|incompatible|interactions?|contre-indications?)\b/i,
               /\b(il\s+est\s+important\s+de\s+éviter|it\s+is\s+important\s+to\s+avoid)\b/i,
               /\b(ne\s+prenez\s+pas|do\s+not\s+take)\b/i,
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
          // unless the user explicitly asks for products in a non-informational context
          // For example: "Quels compléments éviter" = informational, no products
          // But: "Donne-moi une liste de produits pour éviter les carences" = product request, show products
          
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

          const shouldSearchProducts = allowProductSearch && !!(
               hasExplicitProducts ||
               (hasExplicitTrigger && hasSupplementMentions && !interactionIntent) ||
               (hasExplicitTrigger && replyLower.includes('sélection') && !interactionIntent) ||
               explicitProductRequest ||
               (userHasSpecificSupplement && !interactionIntent && userHasProductIntent) ||
               (hasSpecificSupplement && !interactionIntent && hasExplicitTrigger) ||
               (hasSupplementKeywords && !interactionIntent && hasExplicitTrigger) ||
               (hasSupplementMentions && !interactionIntent && (replyLower.includes('voici') || replyLower.includes('sélection'))) ||
               deficiencyIntent
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
               shouldSearchProducts
          })

          if (shouldSearchProducts) {
               try {
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

                    // Track product search attempt
                    analytics.trackEvent('product_search_initiated', {
                         category: 'ecommerce',
                         searchQueries: searchQueries.join(', '),
                         queryCount: searchQueries.length,
                         userId: userId || 'anonymous'
                    })

                    // Search for products using the first query (most relevant)
                    // Using live Shopify Storefront API data
                    if (searchQueries.length > 0) {
                         console.log(`[API] Searching for products with query: "${searchQueries[0]}"`)
                         try {
                              recommendedProducts = await searchProducts(searchQueries[0])
                              console.log(`[API] Found ${recommendedProducts.length} products for query: "${searchQueries[0]}"`)
                              if (recommendedProducts.length > 0) {
                                   console.log(`[API] Product titles: ${recommendedProducts.map(p => p.title).join(', ')}`)
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
                                        const complementaryProducts = await searchProducts(complementaryQueries[0])
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

                         // Track successful product search
                         analytics.trackEvent('product_search_completed', {
                              category: 'ecommerce',
                              searchQuery: searchQueries[0],
                              productCount: recommendedProducts.length,
                              userId: userId || 'anonymous'
                         })

                         // Track individual product recommendations
                         recommendedProducts.forEach((product) => {
                              analytics.trackProductRecommended(
                                   product.title,
                                   product.variantId,
                                   userId || 'anonymous',
                                   'ai_generated'
                              )
                         })
                    }
               } catch (productSearchError) {
                    console.error('Product search error:', productSearchError)

                    // Track product search error
                    analytics.trackEvent('product_search_error', {
                         category: 'error',
                         errorType: 'search_failure',
                         userId: userId || 'anonymous'
                    })

                    // Continue without products if search fails
               }
          } else {
               console.log('No product search needed - AI response indicates no products required')
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

          // Only generate combos if we have products AND user explicitly requested products (not informational)
          if (userProfile && recommendedProducts.length > 0 && allowProductSearch) {
               try {
                    const combos = getRecommendedCombos(
                         userProfile.goals,
                         userProfile.age,
                         userProfile.gender
                    )

                    // Convert combos to include actual product data
                    const combosWithProducts = await Promise.all(
                         combos.map(async (combo) => {
                              const products = await getComboProducts(combo)
                              console.log(`[API] Combo "${combo.name}" resolved products: ${products.map(p => p.title).join(', ') || 'none'}`)
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
               userId: userId || null,
               provider: selectedProvider,
               timestamp: new Date().toISOString()
          }

          // Log response summary for debugging
          console.log(`[API] Response summary - Products: ${finalRecommendedProducts.length}, Combos: ${finalRecommendedCombos?.length || 0}, HasSuggestedCombo: ${!!finalSuggestedCombo}, IsInformational: ${interactionIntent}`)

          // Track successful API response
          analytics.trackEvent('chat_api_response', {
               category: 'api',
               hasProducts: finalRecommendedProducts.length > 0,
               productCount: finalRecommendedProducts.length,
               isInformationalQuestion: interactionIntent,
               responseLength: nutritionResponse.reply?.length || 0,
               userId: userId || 'anonymous',
               provider: selectedProvider
          })

          return NextResponse.json(response)
     } catch (error) {
          console.error('Chat API error:', error)

          // Track API error
          analytics.trackEvent('chat_api_error', {
               category: 'error',
               errorType: 'internal_server_error',
               errorMessage: error instanceof Error ? error.message : 'Unknown error',
               userId: 'unknown'
          })

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
