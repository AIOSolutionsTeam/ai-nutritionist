import { NextRequest, NextResponse } from 'next/server'
import { openaiService, geminiService } from '../../../lib/openai'
import { searchProducts, ProductSearchResult } from '../../../lib/shopify'
import { analytics } from '../../../utils/analytics'

/**
 * Extract supplement-related keywords from AI response for product search
 */
function extractSupplementKeywords(response: string): string[] {
     const supplementKeywords = [
          'vitamin', 'vitamins', 'mineral', 'minerals', 'supplement', 'supplements',
          'omega', 'd3', 'b12', 'magnesium', 'calcium', 'iron', 'zinc', 'selenium',
          'probiotic', 'probiotics', 'collagen', 'turmeric', 'ashwagandha', 'ginseng',
          'multivitamin', 'fish oil', 'protein', 'creatine', 'glutamine', 'bcaa',
          'antioxidant', 'antioxidants', 'herbal', 'herbs', 'extract', 'extracts',
          'capsule', 'capsules', 'tablet', 'tablets', 'powder', 'liquid', 'gummy',
          'organic', 'natural', 'vegan', 'vegetarian', 'gluten-free', 'non-gmo'
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

     // If we found specific supplement keywords, use them
     if (keywords.length > 0) {
          return keywords.slice(0, 3) // Limit to top 3 keywords
     }

     // Fallback to general supplement terms
     return ['supplement', 'vitamin', 'nutrition']
}

export async function POST(request: NextRequest) {
     try {
          const body = await request.json()
          const { message, userId, provider = 'gemini' } = body

          if (!message) {
               return NextResponse.json(
                    { error: 'Message is required' },
                    { status: 400 }
               )
          }

          // Track chat API request
          analytics.trackEvent('chat_api_request', {
               category: 'api',
               messageLength: message.length,
               userId: userId || 'anonymous',
               provider: provider || 'gemini'
          })

          // Select AI provider based on request or environment variable
          const selectedProvider = provider || process.env.AI_PROVIDER || 'openai'

          let nutritionResponse

          try {
               if (selectedProvider === 'gemini') {
                    nutritionResponse = await geminiService.generateNutritionAdvice(message, userId)
               } else {
                    nutritionResponse = await openaiService.generateNutritionAdvice(message, userId)
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
                         nutritionResponse = await geminiService.generateNutritionAdvice(message, userId)
                    } else {
                         nutritionResponse = await openaiService.generateNutritionAdvice(message, userId)
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

          // Search for relevant products based on AI response
          let recommendedProducts: ProductSearchResult[] = []

          try {
               const searchQueries = generateProductSearchQueries(nutritionResponse.reply)
               console.log('Searching for products with queries:', searchQueries)

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

          const response = {
               ...nutritionResponse,
               recommendedProducts,
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
