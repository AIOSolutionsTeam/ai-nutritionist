import { NextRequest, NextResponse } from 'next/server'
import { dbService, IUserProfile } from '../../../lib/db'
import { pdfGenerator, NutritionPlan } from '../../../lib/pdf'
import { openaiService, geminiService, AIQuotaError } from '../../../lib/openai'
import { fetchAllProductsWithParsedData, ProductSearchResult } from '../../../lib/shopify'

/**
 * Translate goals from English to French and remove underscores
 */
function translateGoals(goals: string[]): string[] {
     const goalTranslations: Record<string, string> = {
          'muscle_gain': 'Prise de masse musculaire',
          'weight_loss': 'Perte de poids',
          'sport': 'Sport',
          'fitness': 'Fitness',
          'energy': 'Énergie',
          'sleep': 'Sommeil',
          'stress': 'Stress',
          'immunity': 'Immunité',
          'digestion': 'Digestion',
          'heart': 'Santé cardiaque',
          'beauty': 'Beauté',
          'wellness': 'Bien-être',
          'better_sleep': 'Meilleur sommeil',
          'weight_management': 'Gestion du poids',
          'athletic_performance': 'Performance athlétique',
     }

     return goals.map(goal => {
          const normalizedGoal = goal.toLowerCase().trim()
          return goalTranslations[normalizedGoal] || goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
     })
}

/**
 * Generate a personalized nutrition plan using AI
 */
async function generatePlanWithAI(
     userProfile: IUserProfile,
     recommendedProducts: ProductSearchResult[],
     productContext: string
): Promise<NutritionPlan> {
     const translatedGoals = translateGoals(userProfile.goals)
     const goalsText = translatedGoals.join(', ')

     // Build user profile context for the AI
     const userProfileContext = `
Profil utilisateur:
- Âge: ${userProfile.age} ans
- Sexe: ${userProfile.gender === 'male' ? 'Homme' : userProfile.gender === 'female' ? 'Femme' : 'Autre'}
- Objectifs: ${goalsText}
- Allergies: ${userProfile.allergies.length > 0 ? userProfile.allergies.join(', ') : 'Aucune'}
- Budget: ${userProfile.budget.min}-${userProfile.budget.max} ${userProfile.budget.currency}
`

     try {
          // Try Gemini first
          let planData
          let usedProvider = 'gemini'
          
          try {
               planData = await geminiService.generateNutritionPlan(
                    userProfileContext,
                    productContext
               )
          } catch (geminiError) {
               console.error('[Generate Plan] Gemini error:', geminiError)
               
               // If it's a quota error, try OpenAI as fallback
               if (geminiError instanceof AIQuotaError) {
                    const quotaError = geminiError as AIQuotaError
                    console.warn(`[Generate Plan] Gemini quota exceeded, falling back to OpenAI. retryAfterMs=${quotaError.retryAfterMs ?? 'unknown'}`)
                    
                    // Check if OpenAI is also in cooldown
                    if (openaiService.isInCooldown()) {
                         const remaining = openaiService.getCooldownRemainingMs()
                         console.warn(`[Generate Plan] OpenAI also in cooldown (${Math.ceil(remaining / 1000)}s remaining). Using default plan.`)
                         return createDefaultPlan(userProfile, recommendedProducts)
                    }
                    
                    // Try OpenAI as fallback
                    try {
                         planData = await openaiService.generateNutritionPlan(
                              userProfileContext,
                              productContext
                         )
                         usedProvider = 'openai'
                         console.log('[Generate Plan] Successfully used OpenAI as fallback')
                    } catch (openaiError) {
                         console.error('[Generate Plan] OpenAI fallback also failed:', openaiError)
                         // If OpenAI also fails with quota error, use default plan
                         if (openaiError instanceof AIQuotaError) {
                              console.warn('[Generate Plan] Both providers in quota error. Using default plan.')
                         }
                         return createDefaultPlan(userProfile, recommendedProducts)
                    }
               } else {
                    // Non-quota error, use default plan
                    return createDefaultPlan(userProfile, recommendedProducts)
               }
          }

          // Map supplements to ProductSearchResult format
          const supplements: Array<ProductSearchResult & { moment?: string; duration?: string; comments?: string }> = []
          
          if (planData.supplements && Array.isArray(planData.supplements)) {
               for (const supplement of planData.supplements) {
                    // Try to find matching product from recommended products or catalog
                    let matchingProduct: ProductSearchResult | undefined = recommendedProducts.find(
                         p => p.title.toLowerCase().includes(supplement.title.toLowerCase()) ||
                              supplement.title.toLowerCase().includes(p.title.toLowerCase())
                    )

                    // If not found, try to find in catalog
                    if (!matchingProduct) {
                         const allProducts = await fetchAllProductsWithParsedData()
                         matchingProduct = allProducts.find(
                              p => p.title.toLowerCase().includes(supplement.title.toLowerCase()) ||
                                   supplement.title.toLowerCase().includes(p.title.toLowerCase())
                         )
                    }

                    if (matchingProduct) {
                         supplements.push({
                              ...matchingProduct,
                              moment: supplement.moment || 'À définir',
                              duration: supplement.duration || 'En continu',
                              comments: supplement.comments || supplement.description || ''
                         })
                    } else {
                         // Create a placeholder product
                         supplements.push({
                              title: supplement.title,
                              price: 0,
                              image: '',
                              variantId: '',
                              available: false,
                              currency: 'EUR',
                              moment: supplement.moment || 'À définir',
                              duration: supplement.duration || 'En continu',
                              comments: supplement.comments || supplement.description || ''
                         })
                    }
               }
          }

          // If no supplements from AI and we have recommended products, use them
          if (supplements.length === 0 && recommendedProducts.length > 0) {
               recommendedProducts.forEach(product => {
                    supplements.push({
                         ...product,
                         moment: 'Selon les besoins',
                         duration: 'En continu',
                         comments: product.description || ''
                    })
               })
          }

          return {
               userProfile: {
                    userId: userProfile.userId,
                    age: userProfile.age,
                    gender: userProfile.gender,
                    goals: translatedGoals, // Use translated goals
                    allergies: userProfile.allergies,
                    budget: userProfile.budget,
                    height: undefined,
                    weight: undefined,
                    medications: [],
                    activityLevel: planData.activityLevel || 'Modéré',
                    shopifyCustomerId: userProfile.shopifyCustomerId,
                    shopifyCustomerName: userProfile.shopifyCustomerName,
                    lastInteraction: userProfile.lastInteraction,
                    createdAt: userProfile.createdAt,
                    updatedAt: userProfile.updatedAt,
               },
               recommendations: {
                    dailyCalories: planData.dailyCalories || 2000,
                    macronutrients: planData.macronutrients || {
                         protein: { grams: 125, percentage: 25 },
                         carbs: { grams: 225, percentage: 45 },
                         fats: { grams: 67, percentage: 30 },
                    },
                    activityLevel: planData.activityLevel || 'Modéré',
                    mealPlan: planData.mealPlan || {
                         breakfast: [],
                         morningSnack: [],
                         lunch: [],
                         afternoonSnack: [],
                         dinner: [],
                         eveningSnack: [],
                    },
                    supplements: supplements,
               },
               personalizedTips: planData.personalizedTips || [
                    'Boire 1,5 à 2,5 L d\'eau par jour.',
                    'Viser 7–9 heures de sommeil par nuit pour une meilleure récupération.',
               ],
          }
     } catch (error) {
          console.error('[Generate Plan] Error generating plan with AI:', error)
          // Fallback to default plan
          return createDefaultPlan(userProfile, recommendedProducts)
     }
}

/**
 * Create a default plan when AI fails
 */
function createDefaultPlan(
     userProfile: IUserProfile,
     recommendedProducts: ProductSearchResult[]
): NutritionPlan {
     const translatedGoals = translateGoals(userProfile.goals)
     
     // Calculate daily calories
     let baseCalories = 2000
     if (userProfile.gender === 'male') {
          baseCalories += 200
     } else if (userProfile.gender === 'female') {
          baseCalories -= 200
     }

     if (userProfile.age < 30) {
          baseCalories += 100
     } else if (userProfile.age > 50) {
          baseCalories -= 100
     }

     if (userProfile.goals.includes('weight_loss')) {
          baseCalories -= 300
     } else if (userProfile.goals.includes('muscle_gain')) {
          baseCalories += 300
     }

     let activityLevel = 'Modéré'
     if (userProfile.goals.includes('muscle_gain') || userProfile.goals.includes('sport')) {
          activityLevel = 'Élevé (4-5 entraînements/semaine)'
     } else if (userProfile.goals.includes('weight_loss')) {
          activityLevel = 'Modéré (2-3 entraînements/semaine)'
     }

     // Map recommended products to supplements
     const supplements: Array<ProductSearchResult & { moment?: string; duration?: string; comments?: string }> = 
          recommendedProducts.map(product => ({
               ...product,
               moment: 'Selon les besoins',
               duration: 'En continu',
               comments: product.description || ''
          }))

     return {
          userProfile: {
               userId: userProfile.userId,
               age: userProfile.age,
               gender: userProfile.gender,
               goals: translatedGoals,
               allergies: userProfile.allergies,
               budget: userProfile.budget,
               height: undefined,
               weight: undefined,
               medications: [],
               activityLevel: activityLevel,
               shopifyCustomerId: userProfile.shopifyCustomerId,
               shopifyCustomerName: userProfile.shopifyCustomerName,
               lastInteraction: userProfile.lastInteraction,
               createdAt: userProfile.createdAt,
               updatedAt: userProfile.updatedAt,
          },
          recommendations: {
               dailyCalories: Math.max(1200, baseCalories),
               macronutrients: {
                    protein: { grams: Math.round(baseCalories * 0.25 / 4), percentage: 25 },
                    carbs: { grams: Math.round(baseCalories * 0.45 / 4), percentage: 45 },
                    fats: { grams: Math.round(baseCalories * 0.30 / 9), percentage: 30 },
               },
               activityLevel: activityLevel,
               mealPlan: {
                    breakfast: [
                         '80 g de flocons d\'avoine',
                         '250 ml de boisson végétale (amande ou soja)',
                         '1 banane moyenne',
                         '1 cuillère à soupe de beurre d\'amande',
                    ],
                    morningSnack: [
                         '1 yaourt végétal (soja)',
                         '15–20 g de noix ou amandes',
                    ],
                    lunch: [
                         '150 g de blanc de poulet ou dinde',
                         '120 g de riz basmati (poids cuit)',
                         'Légumes variés (brocolis, carottes, courgettes...)',
                         '1 cuillère à soupe d\'huile d\'olive',
                    ],
                    afternoonSnack: [
                         '1 fruit (pomme ou orange)',
                         '1 barre protéinée sans lactose',
                    ],
                    dinner: [
                         '140 g de saumon ou poisson gras',
                         '150 g de pommes de terre au four',
                         'Légumes verts (haricots verts, épinards...)',
                    ],
                    eveningSnack: [
                         '150 g de fromage blanc végétal (soja)',
                    ],
               },
               supplements: supplements,
          },
          personalizedTips: [
               'Boire 1,5 à 2,5 L d\'eau par jour.',
               'Viser 7–9 heures de sommeil par nuit pour une meilleure récupération.',
               'Être régulier sur l\'alimentation et l\'entraînement : les résultats viennent avec le temps.',
               'Adapter les quantités selon la faim, l\'énergie et l\'évolution du poids (± 100–200 kcal si besoin).',
          ],
     }
}

export async function POST(request: NextRequest) {
     try {
          const body = await request.json()
          const { userId } = body

          if (!userId) {
               return NextResponse.json(
                    { error: 'User ID is required' },
                    { status: 400 }
               )
          }

          // Get user profile
          const userProfile = await dbService.getUserProfile(userId)
          if (!userProfile) {
               return NextResponse.json(
                    { error: 'User profile not found' },
                    { status: 404 }
               )
          }

          // Get recommended products from the request (products recommended by the chat)
          const recommendedProducts: ProductSearchResult[] = []
          if (body.recommendedProducts && Array.isArray(body.recommendedProducts)) {
               recommendedProducts.push(...body.recommendedProducts)
          }

          // Generate product context only from recommended products (not all products)
          let productContext = ''
          if (recommendedProducts.length > 0) {
               productContext = `\n\nRECOMMENDED PRODUCTS FOR THIS USER (use these products in the nutrition plan):\n`;
               productContext += `Total recommended products: ${recommendedProducts.length}\n\n`;
               
               for (const product of recommendedProducts) {
                    productContext += `PRODUCT: ${product.title}\n`;
                    if (product.description) {
                         productContext += `  Description: ${product.description}\n`;
                    }
                    productContext += `  Price: ${product.price} ${product.currency}\n`;
                    productContext += `  Available: ${product.available ? 'Yes' : 'No'}\n`;
                    productContext += '\n';
               }
               
               productContext += `IMPORTANT: Use these recommended products when creating the supplement plan. These are the products that were specifically recommended for this user based on their profile and goals.\n`;
          } else {
               productContext = `\n\nNote: No specific products have been recommended yet. You can suggest relevant products from your knowledge, but focus primarily on the nutrition plan structure.\n`;
          }

          // Generate plan with AI
          const nutritionPlan = await generatePlanWithAI(
               userProfile,
               recommendedProducts,
               productContext
          )

          // Generate PDF
          const pdfUrl = await pdfGenerator.generateNutritionPlanPDF(nutritionPlan)

          return NextResponse.json({
               success: true,
               pdfUrl: pdfUrl,
               plan: nutritionPlan,
          })
     } catch (error) {
          console.error('[Generate Plan] Error:', error)
          return NextResponse.json(
               { error: 'Failed to generate plan', details: error instanceof Error ? error.message : 'Unknown error' },
               { status: 500 }
          )
     }
}

