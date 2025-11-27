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
     
     // Physical info (if available)
     if (userProfile.weight) {
          contextParts.push(`Poids: ${userProfile.weight} kg`)
     }
     if (userProfile.height) {
          contextParts.push(`Taille: ${userProfile.height} cm`)
     }
     
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
          const userHasProductIntent = ['produit', 'produits', 'complément', 'supplément', 'recommande', 'recommander', 'montre moi', 'montrez moi', 'quel produit'].some(t => userLower.includes(t))
          const userHasSpecificSupplement = userLower.match(/\b(vitamine [a-z]|vitamine d|vitamine c|magnésium|oméga|probiotique|collagène|protéine|créatine|fer|zinc|calcium|mélatonine|melatonin)\b/i)

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
          
          const shouldSearchProducts = !!(
               hasExplicitProducts ||
               (hasExplicitTrigger && hasSupplementMentions) ||
               (hasExplicitTrigger && replyLower.includes('sélection')) ||
               userHasProductIntent ||
               userHasSpecificSupplement ||
               (hasSupplementMentions && (replyLower.includes('voici') || replyLower.includes('sélection')))
          )

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
                         searchQueries: searchQueries,
                         queryCount: searchQueries.length,
                         userId: userId || 'anonymous'
                    })

                    // Search for products using the first query (most relevant)
                    if (searchQueries.length > 0) {
                         recommendedProducts = await searchProducts(searchQueries[0])
                         console.log('Found products:', recommendedProducts.length)

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

          if (userProfile && recommendedProducts.length > 0) {
               try {
                    const combos = getRecommendedCombos(
                         userProfile.goals,
                         userProfile.age,
                         userProfile.gender
                    )

                    // Convert combos to include actual product data
                    recommendedCombos = combos.map(combo => ({
                         name: combo.name,
                         description: combo.description,
                         products: getComboProducts(combo),
                         benefits: combo.benefits
                    })).filter(combo => combo.products.length > 0) // Only include combos with available products

                    console.log('Recommended combos:', recommendedCombos.length)

                    // Find a combo that matches the recommended products (for interactive prompt)
                    const matchingCombo = findMatchingCombo(recommendedProducts)
                    if (matchingCombo) {
                         const comboProducts = getComboProducts(matchingCombo)
                         if (comboProducts.length > 0) {
                              suggestedCombo = {
                                   name: matchingCombo.name,
                                   description: matchingCombo.description,
                                   products: comboProducts,
                                   benefits: matchingCombo.benefits
                              }
                              console.log('Found matching combo for interactive suggestion:', suggestedCombo.name)
                         }
                    }
               } catch (comboError) {
                    console.error('Error getting recommended combos:', comboError)
                    // Non-fatal, continue without combos
               }
          }

          const response = {
               ...nutritionResponse,
               recommendedProducts,
               recommendedCombos: recommendedCombos.length > 0 ? recommendedCombos : undefined,
               suggestedCombo: suggestedCombo || undefined, // Combo to suggest interactively
               userId: userId || null,
               provider: selectedProvider,
               timestamp: new Date().toISOString()
          }

          // Track successful API response
          analytics.trackEvent('chat_api_response', {
               category: 'api',
               hasProducts: recommendedProducts.length > 0,
               productCount: recommendedProducts.length,
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
