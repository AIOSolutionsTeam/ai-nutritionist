import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_AI_COOLDOWN_MS = 30_000 // 30 seconds local cooldown when quota errors occur

// OpenAI integration for AI nutritionist functionality
export interface OpenAIConfig {
     apiKey: string
     model: string
     maxTokens: number
     temperature: number
}

export interface GeminiConfig {
     apiKey: string
     model: string
     maxOutputTokens: number
     temperature: number
}

export interface NutritionRecommendation {
     supplement: string
     reason: string
     dosage: string
     timing: string
     interactions?: string[]
     alternatives?: string[]
}

export interface Product {
     name: string
     category: string
     description: string
     benefits: string[]
     dosage?: string
     timing?: string
     interactions?: string[]
}

export interface StructuredNutritionResponse {
     reply: string
     products: Product[]
     disclaimer?: string
     recommendedProducts?: ProductSearchResult[] // Will be populated by the chat API with Shopify products
}

export interface ProductSearchResult {
     title: string
     price: number
     image: string
     variantId: string
     available: boolean
     currency: string
}

export class AIQuotaError extends Error {
     provider: 'openai' | 'gemini'
     retryAfterMs?: number

     constructor(provider: 'openai' | 'gemini', message?: string, retryAfterMs?: number) {
          super(message || `${provider} quota exceeded`)
          this.name = 'AIQuotaError'
          this.provider = provider
          this.retryAfterMs = retryAfterMs
     }
}

export class OpenAIService {
     private openai: OpenAI
     private config: OpenAIConfig

     // Local in-process cooldown when we hit quota / 429 errors
     private quotaResetAt?: number

     constructor(config: OpenAIConfig) {
          this.config = config
          this.openai = new OpenAI({
               apiKey: config.apiKey,
          })
     }

     /**
      * Check if the service is currently in cooldown (without throwing an error)
      * @returns true if in cooldown, false otherwise
      */
     isInCooldown(): boolean {
          return this.quotaResetAt !== undefined && this.quotaResetAt > Date.now()
     }

     /**
      * Get remaining cooldown time in milliseconds
      * @returns remaining milliseconds, or 0 if not in cooldown
      */
     getCooldownRemainingMs(): number {
          if (!this.quotaResetAt || this.quotaResetAt <= Date.now()) {
               return 0
          }
          return this.quotaResetAt - Date.now()
     }

     /**
      * Reset the cooldown timer (call when API is confirmed working again)
      */
     resetCooldown(): void {
          this.quotaResetAt = undefined
          console.log('[OpenAIService] Cooldown timer reset - API is back online')
     }

     /**
      * Perform a lightweight health check to see if the API is back online
      * @returns true if API is working, false if still in quota error
      */
     async checkHealth(): Promise<boolean> {
          try {
               // Make a minimal API call to test if quota is restored
               const testCompletion = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5,
                    temperature: 0
               })
               
               // If we get here without error, the API is working
               if (testCompletion.choices[0]?.message?.content) {
                    this.resetCooldown()
                    return true
               }
               return false
          } catch (error) {
               // Check if it's still a quota error
               const errorObj = error as { status?: number; code?: string; message?: unknown }
               const status = errorObj?.status
               const code = errorObj?.code
               const message: string = typeof errorObj?.message === 'string' ? errorObj.message : ''

               const isQuotaError =
                    status === 429 ||
                    code === 'insufficient_quota' ||
                    message.toLowerCase().includes('insufficient_quota') ||
                    message.toLowerCase().includes('rate limit') ||
                    message.toLowerCase().includes('too many requests') ||
                    message.toLowerCase().includes('quota')

               if (isQuotaError) {
                    // Still in quota error, keep cooldown
                    console.log('[OpenAIService] Health check: Still in quota error, keeping cooldown')
                    return false
               }
               
               // Other error (network, etc.) - don't reset cooldown, but not a quota issue
               console.log('[OpenAIService] Health check: Non-quota error, keeping cooldown')
               return false
          }
     }

     async generateNutritionAdvice(
          userQuery: string, 
          _userId?: string, 
          userProfileContext?: string,
          conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
          productContext?: string
     ): Promise<StructuredNutritionResponse> {
          // Short‑circuit if we're currently in a local cooldown window
          if (this.quotaResetAt && this.quotaResetAt > Date.now()) {
               const remainingMs = this.quotaResetAt - Date.now()
               console.warn(`[OpenAIService] In local cooldown, skipping API call. Remaining ms: ${remainingMs}`)
               throw new AIQuotaError('openai', 'OpenAI in local cooldown', remainingMs)
          }

          // Build system prompt with user context if available
          let userContextSection = ''
          if (userProfileContext && userProfileContext.trim()) {
               userContextSection = `\n\nUSER PROFILE CONTEXT (use this information to personalize your response):
${userProfileContext}

IMPORTANT: Use this profile information to tailor your advice. Consider their age, goals, allergies, and budget when making recommendations. Always respect their dietary restrictions and preferences.`
          }

          // Add product context if available
          const productContextSection = productContext && productContext.trim() ? productContext : ''

          // Determine if this is a continuing conversation
          const isContinuingConversation = conversationHistory && conversationHistory.length > 0
          const conversationContext = isContinuingConversation 
               ? '\n\nIMPORTANT CONVERSATION CONTEXT: This is a CONTINUING conversation. The user has already been greeted and you have been discussing topics. DO NOT greet them again with "Salut", "Bonjour", or similar greetings. Continue naturally from where the conversation left off. Be conversational and natural, as if you\'re continuing a chat with a friend.'
               : ''

          const systemPrompt = `You are a professional, friendly, and empathetic virtual nutritionist for the Vigaïa brand. Your role is to provide personalized nutrition guidance and recommend appropriate wellness products. You are also a helpful sales advisor who guides customers toward the best products for their needs.${userContextSection}${productContextSection}${conversationContext}

COMMUNICATION RULES:
1. **Fluid and Natural Conversation**: Reply in a warm, conversational, and fluid manner. Write as if you're having a friendly chat with a friend, not a clinical consultation. Use natural language, avoid overly formal or robotic tones.
${isContinuingConversation ? '   - **NO GREETINGS**: Since this is a continuing conversation, do NOT start with greetings like "Salut", "Bonjour", "Bien sûr", etc. Jump directly into answering their question naturally.' : ''}

2. **Concise and Clear Responses**: 
   - Keep your responses MODERATELY SHORT - clear and informative, but NOT as long as an essay. Aim for 3-5 sentences for simple questions, and 1-2 short paragraphs maximum for complex topics.
   - Be direct and get straight to the point while still providing useful information. Avoid unnecessary elaboration or repetition.
   - When answering questions about supplement interactions, compatibility, timing, or general nutrition information, provide clear, concise explanations:
     * Explain the key points briefly
     * Provide specific examples when helpful, but keep them short
     * Use bullet points for lists to improve readability
     * Focus on essential information - users want clear answers, not lengthy essays
   - Example of concise response style: "C'est exact, les interactions sont cruciales ! Le plus souvent, c'est une compétition au niveau de l'intestin pour l'absorption, ou un élément bloque l'action d'un autre. Voici les paires à espacer (2-4 heures) : [brief list with short explanations]"
   - When the question is informational/educational (about interactions, compatibility, benefits, timing, etc.), focus on providing valuable information concisely WITHOUT recommending specific products. Set "products" to an empty array [].

3. **Clarity and Understanding**: 
   - If you don't fully understand the user's question or need, REFRAME it back to them and ask for clarification in a friendly way.
   - Example: "Je veux m'assurer de bien comprendre - vous cherchez des produits pour améliorer votre énergie au quotidien, c'est bien ça?"
   - Never guess or assume. It's better to ask than to give incorrect advice.

4. **Refine and Reform Answers**: 
   - If your initial response could be clearer or more helpful, refine it before responding.
   - Ensure your advice is well-structured, easy to understand, and actionable.
   - Break down complex information into digestible, friendly explanations.

5. **Product Recommendations - Sales-Oriented Approach**:
   - **CRITICAL**: Products should ONLY be recommended when the user EXPLICITLY asks for products, supplements, or product lists. For informational/educational questions, NEVER recommend products.
   - When the user EXPLICITLY asks for products using phrases like "lister", "liste", "donner moi", "montre moi", "produit", "produits", "complément", "supplément", "compléments adaptés", "quels compléments" - IMMEDIATELY provide products WITHOUT long explanations first. Be direct and action-oriented.
   - ONLY recommend products when:
     * The user EXPLICITLY asks about products, supplements, or lists (e.g., "lister moi des produits", "quels produits recommandez-vous?", "quels compléments adaptés pour...")
     * The user explicitly wants to purchase something (e.g., "Je cherche un complément pour...", "Avez-vous un produit pour...", "Quels sont les compléments adaptés pour...")
     * The user asks "what supplements" or "which supplements" in the context of a specific need (e.g., "Quels compléments pour la récupération?")
   - **NEVER recommend products for informational questions**:
     * Questions about interactions: "Quels compléments éviter ensemble?", "Peut-on prendre X et Y ensemble?"
     * Questions about compatibility: "Le fer et le calcium sont-ils compatibles?"
     * Questions about timing: "Quand prendre le magnésium?"
     * Questions about benefits: "Quels sont les bienfaits du magnésium?"
     * General information: "Expliquez-moi...", "Qu'est-ce que...", "Parlez-moi de..."
     * General advice: "Comment améliorer mon sommeil?", "Quels aliments manger?"
   - For informational questions, provide comprehensive, educational responses WITHOUT products. Set "products" to an empty array [].
   - **CRITICAL**: When user asks for a product list, start with a BRIEF introduction (1-2 sentences max), then IMMEDIATELY list the products. Do NOT give long explanations before listing products.
   - **BUDGET-AWARE UPSELLING**: When a user mentions a budget, be sales-oriented and help them see value:
     * If a product is within 5-10 euros of their budget, suggest it as a worthwhile investment: "Je vois que vous avez un budget de [X]€. Pour seulement [Y]€ de plus (soit [difference]€), vous pourriez opter pour [Product Name] qui offre [specific benefit]. C'est un excellent investissement pour votre santé !"
     * Frame price differences as small investments: "Pour seulement 5-10€ de plus, vous obtenez [specific advantage]"
     * Emphasize value over price: "C'est un petit investissement supplémentaire qui fait une grande différence pour [benefit]"
     * Be helpful, not pushy - present it as a recommendation, not pressure
   - When you DO recommend products, explain WHY each product is suitable for their specific situation, but keep explanations concise when the user explicitly asked for a list.
   - IMPORTANT: If you're not sure whether to recommend products, DON'T. It's better to provide informative advice without products than to recommend unnecessarily.

6. **Product Combinations & Bundling - Sales Strategy**:
   - **ALWAYS suggest product combinations** when recommending products that work well together.
   - When you recommend a product, immediately suggest complementary products that enhance its effects.
   - Frame combinations as value propositions: "Pour maximiser les résultats, je vous recommande de combiner [Product A] avec [Product B]. Ensemble, ils créent un effet synergique qui [specific benefit]."
   - Use phrases like: "Ces produits se complètent parfaitement", "Ils fonctionnent en synergie", "Pour un effet optimal, combinez-les", "Ensemble, ils offrent [benefit]"
   - Present bundles as smart investments: "En les prenant ensemble, vous optimisez votre routine et obtenez de meilleurs résultats"
   - Always explain the synergistic benefit when suggesting combinations
   - Example: "Ces produits se complètent bien ensemble: [Product A] améliore l'absorption de [Product B], ce qui maximise leurs bienfaits. Je vous recommande de les prendre ensemble pour des résultats optimaux."

7. **Cultural Sensitivity**: 
   - Be aware of dietary preferences in North Africa (halal, local diet habits).
   - Respect cultural and religious dietary restrictions.

8. **Medical Disclaimer**: 
   - Never provide medical diagnoses or treat medical conditions.
   - Always include appropriate disclaimers about consulting healthcare professionals when discussing supplements or health concerns.

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object. Do NOT wrap it in markdown code blocks:
{
  "reply": "Your personalized, fluid, and friendly nutrition advice. Write naturally and conversationally.",
  "products": [
    {
      "name": "Product name",
      "category": "Category (e.g., Vitamins, Minerals, Herbs)",
      "description": "Brief description",
      "benefits": ["benefit 1", "benefit 2"],
      "dosage": "Recommended dosage (optional)",
      "timing": "When to take (optional)",
      "interactions": ["potential interaction"] (optional)
    }
  ],
  "disclaimer": "Appropriate disclaimer when needed (optional)"
}

CRITICAL - RESPONSE COMPLETENESS AND DIRECTNESS:
- ALWAYS ensure your JSON response is COMPLETE and properly closed with closing braces and brackets.
- If listing products, make sure the "products" array is fully included before the response ends.
- NEVER truncate your response mid-sentence or mid-JSON structure.
- If you're running out of space, prioritize completing the JSON structure over verbose explanations.
- When the user asks for a product list (e.g., "lister moi de produit"), keep the "reply" field SHORT (2-3 sentences max) and IMMEDIATELY list products in the "products" array. Do NOT give long explanations before listing products.
- The "reply" field should be concise when listing products - focus on the product information in the "products" array.

IMPORTANT: 
- If the user's question doesn't require product recommendations, set "products" to an empty array [].
- **CRITICAL LANGUAGE REQUIREMENT**: ALWAYS respond in French, regardless of the language the user uses. Even if the user writes in English, Spanish, Arabic, or any other language, you MUST respond in French. This is a mandatory requirement.
- Be empathetic, patient, and genuinely helpful.`

          try {
               // Build messages array with conversation history
               const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                    {
                         role: 'system',
                         content: systemPrompt
                    }
               ]

               // Add conversation history if available (optimized: limit to 5 most recent messages)
               if (conversationHistory && conversationHistory.length > 0) {
                    // Use only the last 5 messages to reduce tokens
                    // If there are more than 5 messages, summarize older ones
                    const MAX_RECENT_MESSAGES = 5
                    const totalMessages = conversationHistory.length
                    
                    if (totalMessages > MAX_RECENT_MESSAGES) {
                         // Keep last 5 messages, summarize the rest
                         const olderMessages = conversationHistory.slice(0, totalMessages - MAX_RECENT_MESSAGES)
                         const recentMessages = conversationHistory.slice(-MAX_RECENT_MESSAGES)
                         
                         // Create a concise summary of older conversation
                         const summary = olderMessages
                              .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`)
                              .join(' | ')
                         
                         // Add summary as a system message
                         messages.push({
                              role: 'system',
                              content: `Previous conversation summary (${olderMessages.length} earlier messages): ${summary}`
                         })
                         
                         // Add recent messages
                         for (const msg of recentMessages) {
                              messages.push({
                                   role: msg.role === 'assistant' ? 'assistant' : 'user',
                                   content: msg.content
                              })
                         }
                    } else {
                         // Fewer than 5 messages, add all
                         for (const msg of conversationHistory) {
                              messages.push({
                                   role: msg.role === 'assistant' ? 'assistant' : 'user',
                                   content: msg.content
                              })
                         }
                    }
               }

               // Add current user query
               messages.push({
                    role: 'user',
                    content: userQuery
               })

               // Log input data sent to model
               console.log('[OpenAIService] Input data sent to model:', {
                    model: this.config.model,
                    messagesCount: messages.length,
                    messages: messages.map(msg => ({
                         role: msg.role,
                         contentLength: msg.content.length,
                         contentPreview: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : '')
                    })),
                    maxTokens: this.config.maxTokens,
                    temperature: this.config.temperature
               })

               const completion = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages: messages,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
               })

               const responseContent = completion.choices[0]?.message?.content
               if (!responseContent) {
                    throw new Error('No response content received from OpenAI')
               }

               // Log output data received from model
               console.log('[OpenAIService] Output data received from model:', {
                    model: this.config.model,
                    responseLength: responseContent.length,
                    responsePreview: responseContent.substring(0, 500) + (responseContent.length > 500 ? '...' : ''),
                    fullResponse: responseContent,
                    usage: completion.usage ? {
                         promptTokens: completion.usage.prompt_tokens,
                         completionTokens: completion.usage.completion_tokens,
                         totalTokens: completion.usage.total_tokens
                    } : undefined
               })

               // Parse the JSON response
               try {
                    // EDGE CASE: Check for truncated JSON (OpenAI doesn't have built-in truncation detection like Gemini)
                    const trimmedContent = responseContent.trim()
                    const isLikelyTruncated = (
                         (!trimmedContent.endsWith('}') && !trimmedContent.endsWith(']')) ||
                         (trimmedContent.match(/\{/g) || []).length !== (trimmedContent.match(/\}/g) || []).length ||
                         (trimmedContent.match(/\[/g) || []).length !== (trimmedContent.match(/\]/g) || []).length ||
                         (trimmedContent.match(/"/g) || []).length % 2 !== 0
                    )
                    
                    if (isLikelyTruncated) {
                         console.warn('[OpenAIService] Response appears to be truncated - JSON structure incomplete')
                         // Try to extract what we can, but log the issue
                    }

                    const parsedResponse = JSON.parse(responseContent)

                    // Check if this is a direct nutrition plan format (for generate-plan route)
                    const isNutritionPlanFormat = 
                         parsedResponse.dailyCalories !== undefined &&
                         parsedResponse.macronutrients !== undefined &&
                         parsedResponse.mealPlan !== undefined &&
                         parsedResponse.supplements !== undefined &&
                         parsedResponse.personalizedTips !== undefined

                    if (isNutritionPlanFormat) {
                         // Wrap nutrition plan JSON in the expected format
                         console.log(`[OpenAIService] Detected nutrition plan format, wrapping in standard structure`)
                         return {
                              reply: JSON.stringify(parsedResponse),
                              products: [],
                              disclaimer: parsedResponse.disclaimer
                         } as StructuredNutritionResponse
                    }

                    // Validate the standard response structure
                    if (!parsedResponse.reply || !Array.isArray(parsedResponse.products)) {
                         throw new Error('Invalid response structure')
                    }
                    
                    // EDGE CASE: Check if reply is empty or just whitespace
                    if (typeof parsedResponse.reply === 'string' && parsedResponse.reply.trim().length === 0) {
                         console.warn('[OpenAIService] Response has empty reply field')
                         throw new Error('Empty reply field')
                    }

                    return parsedResponse as StructuredNutritionResponse
               } catch (parseError) {
                    console.error('Failed to parse OpenAI response as JSON:', parseError)
                    console.error('Raw response (first 500 chars):', responseContent.substring(0, 500))

                    // Try to parse as nutrition plan format if standard format failed
                    try {
                         const trimmedContent = responseContent.trim()
                         // Try to extract JSON object if wrapped in text
                         const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/)
                         if (jsonMatch) {
                              const planData = JSON.parse(jsonMatch[0])
                              // Check if it's a nutrition plan format
                              if (planData.dailyCalories !== undefined &&
                                   planData.macronutrients !== undefined &&
                                   planData.mealPlan !== undefined &&
                                   planData.supplements !== undefined &&
                                   planData.personalizedTips !== undefined) {
                                   console.log('[OpenAIService] Detected nutrition plan format in fallback parsing')
                                   return {
                                        reply: JSON.stringify(planData),
                                        products: [],
                                        disclaimer: planData.disclaimer
                                   } as StructuredNutritionResponse
                              }
                         }
                    } catch {
                         // Not a nutrition plan format, continue with standard fallback
                    }

                    // Fallback to a structured response if JSON parsing fails
                    // EDGE CASE: Try to extract reply text even if JSON is malformed
                    let extractedReply = responseContent
                    const jsonMatch = responseContent.match(/"reply"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/)
                    if (jsonMatch && jsonMatch[1]) {
                         extractedReply = jsonMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
                    }
                    
                    return {
                         reply: extractedReply || responseContent || 'Désolé, je n\'ai pas pu traiter votre demande correctement.',
                         products: [],
                         disclaimer: 'Please consult with a healthcare professional before starting any new supplement regimen.'
                    }
               }
          } catch (error) {
               console.error('OpenAI API error:', error)

               // Detect quota / rate limit errors (429 or insufficient_quota)
               const errorObj = error as { status?: number; code?: string; message?: unknown; headers?: Record<string, string> }
               const status = errorObj?.status
               const code = errorObj?.code
               const message: string = typeof errorObj?.message === 'string' ? errorObj.message : ''

               const isQuotaError =
                    status === 429 ||
                    code === 'insufficient_quota' ||
                    message.toLowerCase().includes('insufficient_quota') ||
                    message.toLowerCase().includes('rate limit') ||
                    message.toLowerCase().includes('too many requests') ||
                    message.toLowerCase().includes('quota')

               if (isQuotaError) {
                    let retryAfterMs: number | undefined

                    // Try to extract a Retry-After header if present
                    const headers = errorObj?.headers
                    const retryAfterHeader = headers?.['retry-after'] || headers?.['Retry-After']
                    if (retryAfterHeader) {
                         const parsed = parseInt(retryAfterHeader, 10)
                         if (!Number.isNaN(parsed) && parsed > 0) {
                              retryAfterMs = parsed * 1000
                         }
                    }

                    const cooldownMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : DEFAULT_AI_COOLDOWN_MS
                    this.quotaResetAt = Date.now() + cooldownMs

                    throw new AIQuotaError('openai', 'OpenAI quota exceeded', retryAfterMs)
               }

               throw new Error('Failed to generate nutrition advice')
          }
     }

     // eslint-disable-next-line @typescript-eslint/no-unused-vars
     async getSupplementRecommendations(_userProfile: unknown): Promise<NutritionRecommendation[]> {
          // This method can be expanded to use OpenAI for more sophisticated recommendations
          return [
               {
                    supplement: 'Vitamin D3',
                    reason: 'Essential for bone health and immune function',
                    dosage: '1000-2000 IU daily',
                    timing: 'With a meal containing fat',
                    interactions: ['May interact with certain medications'],
                    alternatives: ['Sunlight exposure', 'Fortified foods']
               }
          ]
     }

     /**
      * Generate a nutrition plan specifically for PDF generation
      * This uses a dedicated prompt focused only on plan generation
      */
     async generateNutritionPlan(
          userProfileContext: string,
          productContext: string
     ): Promise<{ dailyCalories: number; macronutrients: { protein: { grams: number; percentage: number }; carbs: { grams: number; percentage: number }; fats: { grams: number; percentage: number } }; activityLevel: string; mealPlan: { breakfast: string[]; morningSnack?: string[]; lunch: string[]; afternoonSnack?: string[]; dinner: string[]; eveningSnack?: string[] }; supplements: Array<{ title: string; moment: string; dosage: string; duration: string; comments: string; description?: string }>; personalizedTips: string[] }> {
          // Short‑circuit if we're currently in a local cooldown window
          if (this.quotaResetAt && this.quotaResetAt > Date.now()) {
               const remainingMs = this.quotaResetAt - Date.now()
               console.warn(`[OpenAIService] In local cooldown, skipping API call. Remaining ms: ${remainingMs}`)
               throw new AIQuotaError('openai', 'OpenAI in local cooldown', remainingMs)
          }

          const systemPrompt = `You are a professional nutritionist creating a personalized nutrition plan for a client. Your task is to generate a complete nutrition plan based ONLY on the user profile data and recommended products provided.

CRITICAL RULES:
1. **Use ONLY the provided data**: Base your plan EXCLUSIVELY on the user profile and recommended products (if any) provided. Do not invent or assume information not given.
2. **Follow the exact JSON format**: You MUST return ONLY a valid JSON object in the exact format specified below. Do NOT wrap it in markdown code blocks, do NOT add any text before or after the JSON.
3. **Complete all required fields**: Every field in the JSON structure must be filled with appropriate values based on the user's profile.
4. **Product usage**: 
   - If recommended products are provided, you MUST include ALL of them in the supplements section with SHORT and BRIEF information. Do NOT skip or omit any recommended products.
   - If NO products are provided (productContext is empty), return an EMPTY supplements array: []
   - NEVER invent or suggest products when no products are provided
   - For each supplement when products ARE provided:
     * title: exact product name from the provided list
     * moment: short time indication (e.g., 'Matin', 'Soir', 'Matin et Soir'). Use line breaks (\n) if multiple times need to be on separate lines.
     * dosage: SHORT and SIMPLE (e.g., '1 gélule', '2 comprimés') - NOT a paragraph, just a simple line. If needed, use line breaks (\n) for multi-part instructions.
     * duration: short duration (e.g., '3 mois', 'En continu')
     * comments: SHORT and BRIEF - MUST include important contraindication information from the product data (e.g., "À prendre à jeun", "Ne pas prendre avec X", "Éviter si..."). Extract key safety/precaution info from contraindications and keep it concise (maximum 8-10 words per line). Use line breaks (\n) to separate multiple important points for better readability in the PDF table.
5. **Meal planning**: Create realistic, culturally appropriate meals (considering halal if relevant) for 6 meals per day: breakfast, morningSnack, lunch, afternoonSnack, dinner, eveningSnack
6. **Calorie calculation**: Estimate daily calories based on age, gender, and goals from the profile
7. **Macronutrients**: Calculate appropriate protein, carbs, and fats percentages and grams based on the user's goals
8. **Activity level**: Determine appropriate activity level based on goals and profile
9. **Personalized tips**: Provide 3-5 practical, actionable tips specific to the user's profile

RESPONSE FORMAT - Return ONLY this JSON structure (no markdown, no text before/after):
{
  "dailyCalories": number,
  "macronutrients": {
    "protein": { "grams": number, "percentage": number },
    "carbs": { "grams": number, "percentage": number },
    "fats": { "grams": number, "percentage": number }
  },
  "activityLevel": "string",
  "mealPlan": {
    "breakfast": ["string", "string"],
    "morningSnack": ["string"],
    "lunch": ["string", "string"],
    "afternoonSnack": ["string"],
    "dinner": ["string", "string"],
    "eveningSnack": ["string"]
  },
  "supplements": [
    {
      "title": "string (exact product name if from provided list)",
      "moment": "string (e.g., 'Matin', 'Soir', 'Matin et Soir')",
      "dosage": "string (e.g., '1 gélule', '2 comprimés')",
      "duration": "string (e.g., '3 mois', 'En continu')",
      "comments": "string (additional notes)",
      "description": "string (optional, product description)"
    }
  ],
  "personalizedTips": ["string", "string", "string"]
}

USER PROFILE DATA:
${userProfileContext}

${productContext ? `RECOMMENDED PRODUCTS:\n${productContext}\n\nCRITICAL: You MUST include ALL of the recommended products listed above in the supplements section. Do NOT skip, omit, or selectively choose which products to include. Every product in the RECOMMENDED PRODUCTS list must appear in the supplements array. 

For the comments field: Extract and include important contraindication information from the product data (e.g., "À prendre à jeun", "Ne pas prendre avec X", "Éviter si..."). This is critical safety information that users need to know. Keep comments SHORT and BRIEF (maximum 8-10 words per line), using line breaks (\n) to separate multiple important points.

For dosage and mode d'emploi, return SHORT and BRIEF answers - simple lines like "Prenez 1 gélule" for dosage, not paragraphs.` : 'NOTE: No products have been recommended for this user. Return an EMPTY supplements array: []. Do NOT suggest or invent any products.'}

Remember: Return ONLY the JSON object, nothing else.`

          try {
               const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                    {
                         role: 'system',
                         content: systemPrompt
                    },
                    {
                         role: 'user',
                         content: 'Génère le plan nutritionnel personnalisé complet basé sur les données fournies.'
                    }
               ]

               // Log input data sent to model
               console.log('[OpenAIService] Plan generation - Input data sent to model:', {
                    model: this.config.model,
                    userProfileContextLength: userProfileContext.length,
                    productContextLength: productContext.length,
                    hasProducts: productContext.length > 0
               })

               const completion = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages: messages,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
               })

               const responseContent = completion.choices[0]?.message?.content
               if (!responseContent) {
                    throw new Error('No response content received from OpenAI')
               }

               // Log output data received from model
               console.log('[OpenAIService] Plan generation - Output data received from model:', {
                    model: this.config.model,
                    responseLength: responseContent.length,
                    responsePreview: responseContent.substring(0, 500) + (responseContent.length > 500 ? '...' : ''),
                    fullResponse: responseContent
               })

               // Parse the JSON response
               try {
                    // Clean the response - remove markdown code blocks if present
                    let cleanedContent = responseContent.trim()
                    if (cleanedContent.startsWith('```json')) {
                         cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
                    } else if (cleanedContent.startsWith('```')) {
                         cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
                    }

                    // Extract JSON if there's text around it
                    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                         cleanedContent = jsonMatch[0]
                    }

                    const planData = JSON.parse(cleanedContent)

                    // Validate required fields
                    if (!planData.dailyCalories || !planData.macronutrients || !planData.mealPlan || !planData.supplements || !planData.personalizedTips) {
                         throw new Error('Missing required fields in nutrition plan response')
                    }

                    return planData
               } catch (parseError) {
                    console.error('[OpenAIService] Failed to parse nutrition plan response:', parseError)
                    console.error('[OpenAIService] Raw response:', responseContent)
                    throw new Error('Failed to parse nutrition plan response')
               }
          } catch (error) {
               console.error('[OpenAIService] Error generating nutrition plan:', error)

               // Detect quota / rate limit errors
               const errorObj = error as { status?: number; code?: string; message?: unknown; headers?: Record<string, string> }
               const status = errorObj?.status
               const code = errorObj?.code
               const message: string = typeof errorObj?.message === 'string' ? errorObj.message : ''

               const isQuotaError =
                    status === 429 ||
                    code === 'insufficient_quota' ||
                    message.toLowerCase().includes('insufficient_quota') ||
                    message.toLowerCase().includes('rate limit') ||
                    message.toLowerCase().includes('too many requests') ||
                    message.toLowerCase().includes('quota')

               if (isQuotaError) {
                    let retryAfterMs: number | undefined

                    const headers = errorObj?.headers
                    const retryAfterHeader = headers?.['retry-after'] || headers?.['Retry-After']
                    if (retryAfterHeader) {
                         const parsed = parseInt(retryAfterHeader, 10)
                         if (!Number.isNaN(parsed) && parsed > 0) {
                              retryAfterMs = parsed * 1000
                         }
                    }

                    const cooldownMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : DEFAULT_AI_COOLDOWN_MS
                    this.quotaResetAt = Date.now() + cooldownMs

                    throw new AIQuotaError('openai', 'OpenAI quota exceeded', retryAfterMs)
               }

               throw error
          }
     }
}

export class GeminiService {
     private genAI: GoogleGenerativeAI
     private config: GeminiConfig
     // Reduced fallback models to prevent excessive API calls - only use one fallback
     private fallbackModels = ['gemini-2.0-flash']
     private quotaResetAt?: number

     constructor(config: GeminiConfig) {
          this.config = config
          this.genAI = new GoogleGenerativeAI(config.apiKey)
     }

     /**
      * Check if the service is currently in cooldown (without throwing an error)
      * @returns true if in cooldown, false otherwise
      */
     isInCooldown(): boolean {
          return this.quotaResetAt !== undefined && this.quotaResetAt > Date.now()
     }

     /**
      * Get remaining cooldown time in milliseconds
      * @returns remaining milliseconds, or 0 if not in cooldown
      */
     getCooldownRemainingMs(): number {
          if (!this.quotaResetAt || this.quotaResetAt <= Date.now()) {
               return 0
          }
          return this.quotaResetAt - Date.now()
     }

     /**
      * Reset the cooldown timer (call when API is confirmed working again)
      */
     resetCooldown(): void {
          this.quotaResetAt = undefined
          console.log('[GeminiService] Cooldown timer reset - API is back online')
     }

     /**
      * Perform a lightweight health check to see if the API is back online
      * @returns true if API is working, false if still in quota error
      */
     async checkHealth(): Promise<boolean> {
          try {
               // Make a minimal API call to test if quota is restored
               const model = this.genAI.getGenerativeModel({
                    model: this.config.model,
                    generationConfig: {
                         maxOutputTokens: 5,
                         temperature: 0,
                    }
               })

               const result = await model.generateContent('test')
               const response = await result.response
               const text = response.text()

               // If we get here without error, the API is working
               if (text) {
                    this.resetCooldown()
                    return true
               }
               return false
          } catch (error) {
               // Check if it's still a quota error
               if (this.isQuotaError(error)) {
                    // Still in quota error, keep cooldown
                    console.log('[GeminiService] Health check: Still in quota error, keeping cooldown')
                    return false
               }
               
               // Other error (network, etc.) - don't reset cooldown, but not a quota issue
               console.log('[GeminiService] Health check: Non-quota error, keeping cooldown')
               return false
          }
     }

     private isQuotaError(error: unknown): boolean {
          if (!error || typeof error !== 'object') return false

          const errorObj = error as { status?: number; message?: unknown }
          if (errorObj.status === 429) {
               return true
          }

          const message: string = typeof errorObj.message === 'string' ? errorObj.message : ''
          const lower = message.toLowerCase()
          return lower.includes('too many requests') ||
               lower.includes('quota') ||
               lower.includes('rate limit')
     }

     private cleanJsonResponse(response: string): string {
          // Remove markdown code blocks if present
          let cleaned = response.trim()

          // Remove ```json and ``` markers
          if (cleaned.startsWith('```json')) {
               cleaned = cleaned.replace(/^```json\s*/, '')
          } else if (cleaned.startsWith('```')) {
               cleaned = cleaned.replace(/^```\s*/, '')
          }

          if (cleaned.endsWith('```')) {
               cleaned = cleaned.replace(/\s*```$/, '')
          }

          // Extract JSON object if there's text before or after it
          // Look for the first { that starts a JSON object
          const jsonStartIndex = cleaned.indexOf('{')
          if (jsonStartIndex > 0) {
               // There's text before the JSON, extract just the JSON part
               cleaned = cleaned.substring(jsonStartIndex)
               console.log(`[GeminiService] Extracted JSON from response (removed ${jsonStartIndex} characters of preceding text)`)
          }

          // Find the matching closing brace to extract complete JSON object
          // This handles cases where there's text after the JSON
          if (cleaned.startsWith('{')) {
               let braceCount = 0
               let jsonEndIndex = -1
               
               for (let i = 0; i < cleaned.length; i++) {
                    if (cleaned[i] === '{') {
                         braceCount++
                    } else if (cleaned[i] === '}') {
                         braceCount--
                         if (braceCount === 0) {
                              jsonEndIndex = i + 1
                              break
                         }
                    }
               }
               
               if (jsonEndIndex > 0 && jsonEndIndex < cleaned.length) {
                    // Extract only the JSON part, discard any text after
                    cleaned = cleaned.substring(0, jsonEndIndex)
                    console.log(`[GeminiService] Extracted complete JSON object (removed text after JSON)`)
               }
          }

          return cleaned.trim()
     }

     // Attempt to sanitize model output into valid JSON:
     // - Replace invalid escape sequences (e.g. \_) with safe characters
     // - Escape raw newlines inside quoted strings
     // - Keep valid JSON escapes intact
     private sanitizeJsonForParse(jsonText: string): string {
          // 1) Remove backslash before underscore or other non-standard escapes
          let repaired = jsonText.replace(/\\_/g, '_')
          repaired = repaired.replace(/\\(?!["\\/bfnrtu])/g, '') // remove stray backslashes before invalid escapes

          // 2) Replace raw newlines within quoted strings by \n
          let result = ''
          let inString = false
          let isEscaped = false
          for (let i = 0; i < repaired.length; i++) {
               const ch = repaired[i]
               if (!inString) {
                    result += ch
                    if (ch === '"') {
                         inString = true
                         isEscaped = false
                    }
                    continue
               }

               // We are inside a string
               if (isEscaped) {
                    // Current char is escaped, keep as-is
                    result += ch
                    isEscaped = false
                    continue
               }

               if (ch === '\\') {
                    isEscaped = true
                    result += ch
                    continue
               }

               if (ch === '"') {
                    inString = false
                    result += ch
                    continue
               }

               if (ch === '\n' || ch === '\r') {
                    result += '\\n'
               } else {
                    result += ch
               }
          }

          return result
     }

     private isTruncatedJson(jsonString: string): boolean {
          // Check for common signs of truncated JSON
          const trimmed = jsonString.trim()

          // If it doesn't end with } or ], it's likely truncated
          if (!trimmed.endsWith('}') && !trimmed.endsWith(']')) {
               return true
          }

          // Check for unterminated strings (quotes that aren't closed)
          const quoteCount = (trimmed.match(/"/g) || []).length
          if (quoteCount % 2 !== 0) {
               return true
          }

          // Count opening and closing braces/brackets
          const openBraces = (trimmed.match(/\{/g) || []).length
          const closeBraces = (trimmed.match(/\}/g) || []).length
          const openBrackets = (trimmed.match(/\[/g) || []).length
          const closeBrackets = (trimmed.match(/\]/g) || []).length

          return openBraces !== closeBraces || openBrackets !== closeBrackets
     }

     async generateNutritionAdvice(
          userQuery: string, 
          _userId?: string, 
          userProfileContext?: string,
          conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
          productContext?: string
     ): Promise<StructuredNutritionResponse> {
          // Local in-process cooldown when we hit quota / 429 errors
          if (this.quotaResetAt && this.quotaResetAt > Date.now()) {
               const remainingMs = this.quotaResetAt - Date.now()
               console.warn(`[GeminiService] In local cooldown, skipping API call. Remaining ms: ${remainingMs}`)
               throw new AIQuotaError('gemini', 'Gemini in local cooldown', remainingMs)
          }

          // Build system prompt with user context if available
          let userContextSection = ''
          if (userProfileContext && userProfileContext.trim()) {
               userContextSection = `\n\nUSER PROFILE CONTEXT (use this information to personalize your response):
${userProfileContext}

IMPORTANT: Use this profile information to tailor your advice. Consider their age, goals, allergies, and budget when making recommendations. Always respect their dietary restrictions and preferences.`
          }

          // Add product context if available
          const productContextSection = productContext && productContext.trim() ? productContext : ''

          // Determine if this is a continuing conversation
          const isContinuingConversation = conversationHistory && conversationHistory.length > 0
          const conversationContext = isContinuingConversation 
               ? '\n\nIMPORTANT CONVERSATION CONTEXT: This is a CONTINUING conversation. The user has already been greeted and you have been discussing topics. DO NOT greet them again with "Salut", "Bonjour", or similar greetings. Continue naturally from where the conversation left off. Be conversational and natural, as if you\'re continuing a chat with a friend.'
               : ''

          const systemPrompt = `You are a professional, friendly, and empathetic virtual nutritionist for the Vigaïa brand. Your role is to provide personalized nutrition guidance and recommend appropriate wellness products. You are also a helpful sales advisor who guides customers toward the best products for their needs.${userContextSection}${productContextSection}${conversationContext}

COMMUNICATION RULES:
1. **Fluid and Natural Conversation**: Reply in a warm, conversational, and fluid manner. Write as if you're having a friendly chat with a friend, not a clinical consultation. Use natural language, avoid overly formal or robotic tones.
${isContinuingConversation ? '   - **NO GREETINGS**: Since this is a continuing conversation, do NOT start with greetings like "Salut", "Bonjour", "Bien sûr", etc. Jump directly into answering their question naturally.' : ''}

2. **Concise and Clear Responses**: 
   - Keep your responses MODERATELY SHORT - clear and informative, but NOT as long as an essay. Aim for 3-5 sentences for simple questions, and 1-2 short paragraphs maximum for complex topics.
   - Be direct and get straight to the point while still providing useful information. Avoid unnecessary elaboration or repetition.
   - When answering questions about supplement interactions, compatibility, timing, or general nutrition information, provide clear, concise explanations:
     * Explain the key points briefly
     * Provide specific examples when helpful, but keep them short
     * Use bullet points for lists to improve readability
     * Focus on essential information - users want clear answers, not lengthy essays
   - Example of concise response style: "C'est exact, les interactions sont cruciales ! Le plus souvent, c'est une compétition au niveau de l'intestin pour l'absorption, ou un élément bloque l'action d'un autre. Voici les paires à espacer (2-4 heures) : [brief list with short explanations]"
   - When the question is informational/educational (about interactions, compatibility, benefits, timing, etc.), focus on providing valuable information concisely WITHOUT recommending specific products. Set "products" to an empty array [].

3. **Clarity and Understanding**: 
   - If you don't fully understand the user's question or need, REFRAME it back to them and ask for clarification in a friendly way.
   - Example: "Je veux m'assurer de bien comprendre - vous cherchez des produits pour améliorer votre énergie au quotidien, c'est bien ça?"
   - Never guess or assume. It's better to ask than to give incorrect advice.

4. **Refine and Reform Answers**: 
   - If your initial response could be clearer or more helpful, refine it before responding.
   - Ensure your advice is well-structured, easy to understand, and actionable.
   - Break down complex information into digestible, friendly explanations.

5. **Product Recommendations - Sales-Oriented Approach**:
   - **CRITICAL**: Products should ONLY be recommended when the user EXPLICITLY asks for products, supplements, or product lists. For informational/educational questions, NEVER recommend products.
   - When the user EXPLICITLY asks for products using phrases like "lister", "liste", "donner moi", "montre moi", "produit", "produits", "complément", "supplément", "compléments adaptés", "quels compléments" - IMMEDIATELY provide products WITHOUT long explanations first. Be direct and action-oriented.
   - ONLY recommend products when:
     * The user EXPLICITLY asks about products, supplements, or lists (e.g., "lister moi des produits", "quels produits recommandez-vous?", "quels compléments adaptés pour...")
     * The user explicitly wants to purchase something (e.g., "Je cherche un complément pour...", "Avez-vous un produit pour...", "Quels sont les compléments adaptés pour...")
     * The user asks "what supplements" or "which supplements" in the context of a specific need (e.g., "Quels compléments pour la récupération?")
   - **NEVER recommend products for informational questions**:
     * Questions about interactions: "Quels compléments éviter ensemble?", "Peut-on prendre X et Y ensemble?"
     * Questions about compatibility: "Le fer et le calcium sont-ils compatibles?"
     * Questions about timing: "Quand prendre le magnésium?"
     * Questions about benefits: "Quels sont les bienfaits du magnésium?"
     * General information: "Expliquez-moi...", "Qu'est-ce que...", "Parlez-moi de..."
     * General advice: "Comment améliorer mon sommeil?", "Quels aliments manger?"
   - For informational questions, provide comprehensive, educational responses WITHOUT products. Set "products" to an empty array [].
   - **CRITICAL**: When user asks for a product list, start with a BRIEF introduction (1-2 sentences max), then IMMEDIATELY list the products. Do NOT give long explanations before listing products.
   - **BUDGET-AWARE UPSELLING**: When a user mentions a budget, be sales-oriented and help them see value:
     * If a product is within 5-10 euros of their budget, suggest it as a worthwhile investment: "Je vois que vous avez un budget de [X]€. Pour seulement [Y]€ de plus (soit [difference]€), vous pourriez opter pour [Product Name] qui offre [specific benefit]. C'est un excellent investissement pour votre santé !"
     * Frame price differences as small investments: "Pour seulement 5-10€ de plus, vous obtenez [specific advantage]"
     * Emphasize value over price: "C'est un petit investissement supplémentaire qui fait une grande différence pour [benefit]"
     * Be helpful, not pushy - present it as a recommendation, not pressure
   - When you DO recommend products, explain WHY each product is suitable for their specific situation, but keep explanations concise when the user explicitly asked for a list.
   - IMPORTANT: If you're not sure whether to recommend products, DON'T. It's better to provide informative advice without products than to recommend unnecessarily.

6. **Product Combinations & Bundling - Sales Strategy**:
   - **ALWAYS suggest product combinations** when recommending products that work well together.
   - When you recommend a product, immediately suggest complementary products that enhance its effects.
   - Frame combinations as value propositions: "Pour maximiser les résultats, je vous recommande de combiner [Product A] avec [Product B]. Ensemble, ils créent un effet synergique qui [specific benefit]."
   - Use phrases like: "Ces produits se complètent parfaitement", "Ils fonctionnent en synergie", "Pour un effet optimal, combinez-les", "Ensemble, ils offrent [benefit]"
   - Present bundles as smart investments: "En les prenant ensemble, vous optimisez votre routine et obtenez de meilleurs résultats"
   - Always explain the synergistic benefit when suggesting combinations
   - Example: "Ces produits se complètent bien ensemble: [Product A] améliore l'absorption de [Product B], ce qui maximise leurs bienfaits. Je vous recommande de les prendre ensemble pour des résultats optimaux."

7. **Cultural Sensitivity**: 
   - Be aware of dietary preferences in North Africa (halal, local diet habits).
   - Respect cultural and religious dietary restrictions.

8. **Medical Disclaimer**: 
   - Never provide medical diagnoses or treat medical conditions.
   - Always include appropriate disclaimers about consulting healthcare professionals when discussing supplements or health concerns.

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object. Do NOT wrap it in markdown code blocks:
{
  "reply": "Your personalized, fluid, and friendly nutrition advice. Write naturally and conversationally.",
  "products": [
    {
      "name": "Product name",
      "category": "Category",
      "description": "Brief description",
      "benefits": ["benefit 1", "benefit 2"],
      "dosage": "Recommended dosage (optional)",
      "timing": "When to take (optional)",
      "interactions": ["potential interaction"] (optional)
    }
  ],
  "disclaimer": "Appropriate disclaimer when needed (optional)"
}

CRITICAL - RESPONSE COMPLETENESS AND DIRECTNESS:
- ALWAYS ensure your JSON response is COMPLETE and properly closed with closing braces and brackets.
- If listing products, make sure the "products" array is fully included before the response ends.
- NEVER truncate your response mid-sentence or mid-JSON structure.
- If you're running out of space, prioritize completing the JSON structure over verbose explanations.
- When the user asks for a product list (e.g., "lister moi de produit"), keep the "reply" field SHORT (2-3 sentences max) and IMMEDIATELY list products in the "products" array. Do NOT give long explanations before listing products.
- The "reply" field should be concise when listing products - focus on the product information in the "products" array.

IMPORTANT: 
- If the user's question doesn't require product recommendations, set "products" to an empty array [].
- **CRITICAL LANGUAGE REQUIREMENT**: ALWAYS respond in French, regardless of the language the user uses. Even if the user writes in English, Spanish, Arabic, or any other language, you MUST respond in French. This is a mandatory requirement.
- Be empathetic, patient, and genuinely helpful.`

          // Build conversation context for Gemini (optimized: limit to 5 most recent messages)
          let conversationContextText = ''
          if (conversationHistory && conversationHistory.length > 0) {
               const MAX_RECENT_MESSAGES = 5
               const totalMessages = conversationHistory.length
               
               if (totalMessages > MAX_RECENT_MESSAGES) {
                    // Keep last 5 messages, summarize the rest
                    const olderMessages = conversationHistory.slice(0, totalMessages - MAX_RECENT_MESSAGES)
                    const recentMessages = conversationHistory.slice(-MAX_RECENT_MESSAGES)
                    
                    // Create a concise summary of older conversation
                    const summary = olderMessages
                         .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}`)
                         .join(' | ')
                    
                    conversationContextText = '\n\nCONVERSATION HISTORY:\n'
                    conversationContextText += `[Summary of ${olderMessages.length} earlier messages: ${summary}]\n\n`
                    conversationContextText += 'Recent messages:\n'
                    for (const msg of recentMessages) {
                         conversationContextText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
                    }
               } else {
                    // Fewer than 5 messages, include all
                    conversationContextText = '\n\nCONVERSATION HISTORY:\n'
                    for (const msg of conversationHistory) {
                         conversationContextText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
                    }
               }
          }

          // Try the configured model first, with limited fallback to reduce API calls
          // Only use fallback for specific errors (truncation, not quota errors)
          const modelsToTry = [this.config.model, ...this.fallbackModels.filter(m => m !== this.config.model).slice(0, 1)] // Limit to 1 fallback

          let lastError: Error | null = null

          for (const modelName of modelsToTry) {
               try {
                    const model = this.genAI.getGenerativeModel({
                         model: modelName,
                         generationConfig: {
                              maxOutputTokens: this.config.maxOutputTokens,
                              temperature: this.config.temperature,
                         }
                    })

                    const prompt = `${systemPrompt}${conversationContextText}\n\nUser Question: ${userQuery}`
                    
                    // Log input data sent to model
                    console.log('[GeminiService] Input data sent to model:', {
                         model: modelName,
                         promptLength: prompt.length,
                         promptPreview: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
                         fullPrompt: prompt,
                         maxOutputTokens: this.config.maxOutputTokens,
                         temperature: this.config.temperature,
                         userQuery: userQuery,
                         conversationHistoryLength: conversationHistory?.length || 0
                    })
                    
                    const result = await model.generateContent(prompt)
                    const response = await result.response
                    const responseContent = response.text()

                    if (!responseContent) {
                         throw new Error('No response content received from Gemini')
                    }

                    // Log output data received from model
                    console.log('[GeminiService] Output data received from model:', {
                         model: modelName,
                         responseLength: responseContent.length,
                         responsePreview: responseContent.substring(0, 500) + (responseContent.length > 500 ? '...' : ''),
                         fullResponse: responseContent,
                         usage: result.response?.usageMetadata ? {
                              promptTokenCount: result.response.usageMetadata.promptTokenCount,
                              candidatesTokenCount: result.response.usageMetadata.candidatesTokenCount,
                              totalTokenCount: result.response.usageMetadata.totalTokenCount
                         } : undefined
                    })

                    // Parse the JSON response
                    try {
                         // Clean the response content by removing markdown code blocks
                         const cleanedContent = this.cleanJsonResponse(responseContent)

                         // Check if the JSON appears to be truncated
                         if (this.isTruncatedJson(cleanedContent)) {
                              console.warn(`Gemini response appears truncated for model ${modelName}`)
                              // Only try fallback for truncation errors, not other parsing errors
                              if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
                                   throw new Error('Response appears to be truncated')
                              }
                              throw new Error('Response appears to be truncated')
                         }

                         const parsedResponse = JSON.parse(cleanedContent)

                         // Check if this is a direct nutrition plan format (for generate-plan route)
                         const isNutritionPlanFormat = 
                              parsedResponse.dailyCalories !== undefined &&
                              parsedResponse.macronutrients !== undefined &&
                              parsedResponse.mealPlan !== undefined &&
                              parsedResponse.supplements !== undefined &&
                              parsedResponse.personalizedTips !== undefined

                         if (isNutritionPlanFormat) {
                              // Wrap nutrition plan JSON in the expected format
                              console.log(`[GeminiService] Detected nutrition plan format, wrapping in standard structure`)
                              return {
                                   reply: JSON.stringify(parsedResponse),
                                   products: [],
                                   disclaimer: parsedResponse.disclaimer
                              } as StructuredNutritionResponse
                         }

                         // Validate the standard response structure
                         if (!parsedResponse.reply || !Array.isArray(parsedResponse.products)) {
                              throw new Error('Invalid response structure')
                         }

                         console.log(`Successfully used Gemini model: ${modelName}`)
                         return parsedResponse as StructuredNutritionResponse
                    } catch (parseError) {
                         console.error('Failed to parse Gemini response as JSON:', parseError)
                         console.error('Raw response:', responseContent)

                         // If this is a truncation error and we have more models to try, continue
                         if (parseError instanceof Error && parseError.message === 'Response appears to be truncated') {
                              if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
                                   lastError = parseError
                                   continue
                              }
                         }

                         // Try a sanitization pass and parse again (only for current model, don't retry with fallback)
                         try {
                              const cleanedContent = this.cleanJsonResponse(responseContent)
                              const sanitized = this.sanitizeJsonForParse(cleanedContent)
                              const reparsed = JSON.parse(sanitized)

                              // Check if this is a direct nutrition plan format (for generate-plan route)
                              const isNutritionPlanFormat = 
                                   reparsed.dailyCalories !== undefined &&
                                   reparsed.macronutrients !== undefined &&
                                   reparsed.mealPlan !== undefined &&
                                   reparsed.supplements !== undefined &&
                                   reparsed.personalizedTips !== undefined

                              if (isNutritionPlanFormat) {
                                   // Wrap nutrition plan JSON in the expected format
                                   console.log(`[GeminiService] Detected nutrition plan format after sanitization, wrapping in standard structure`)
                                   return {
                                        reply: JSON.stringify(reparsed),
                                        products: [],
                                        disclaimer: reparsed.disclaimer
                                   } as StructuredNutritionResponse
                              }

                              if (!reparsed.reply || !Array.isArray(reparsed.products)) {
                                   throw new Error('Invalid response structure after sanitization')
                              }

                              console.log(`Successfully parsed Gemini response after sanitization for model: ${modelName}`)
                              return reparsed as StructuredNutritionResponse
                         } catch (sanitizationError) {
                              console.error('Sanitized parsing also failed:', sanitizationError)
                              // Don't try fallback for parsing errors - just return fallback response
                              if (modelsToTry.indexOf(modelName) === modelsToTry.length - 1) {
                                   // Last model, return fallback response
                                   return {
                                        reply: responseContent,
                                        products: [],
                                        disclaimer: 'Please consult with a healthcare professional before starting any new supplement regimen.'
                                   }
                              }
                         }
                    }
               } catch (modelError) {
                    console.error(`Gemini model ${modelName} failed:`, modelError)
                    lastError = modelError instanceof Error ? modelError : new Error(String(modelError))

                    // If this is a quota / rate limit error, stop trying other models immediately
                    if (this.isQuotaError(modelError)) {
                         let retryAfterMs: number | undefined
                         const errorObj = modelError as { message?: unknown }
                         const message: string = typeof errorObj?.message === 'string'
                              ? errorObj.message
                              : ''
                         const match = message.match(/retry in (\d+(?:\.\d+)?)s/i)
                         if (match) {
                              const seconds = parseFloat(match[1])
                              if (!Number.isNaN(seconds) && seconds > 0) {
                                   retryAfterMs = seconds * 1000
                              }
                         }

                         const cooldownMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : DEFAULT_AI_COOLDOWN_MS
                         this.quotaResetAt = Date.now() + cooldownMs

                         throw new AIQuotaError('gemini', 'Gemini quota exceeded', retryAfterMs)
                    }

                    // Only continue to next model if:
                    // 1. We have more models to try
                    // 2. This is a truncation error (not other errors)
                    if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
                         const isTruncationError = lastError?.message === 'Response appears to be truncated'
                         if (isTruncationError) {
                              continue // Try next model for truncation
                         }
                         // For other errors, don't waste API calls on fallback
                         break
                    }
               }
          }

          // If all models failed
          throw lastError || new Error('All Gemini models failed to generate response')
     }

     // eslint-disable-next-line @typescript-eslint/no-unused-vars
     async getSupplementRecommendations(_userProfile: unknown): Promise<NutritionRecommendation[]> {
          // This method can be expanded to use Gemini for more sophisticated recommendations
          return [
               {
                    supplement: 'Vitamin D3',
                    reason: 'Essential for bone health and immune function',
                    dosage: '1000-2000 IU daily',
                    timing: 'With a meal containing fat',
                    interactions: ['May interact with certain medications'],
                    alternatives: ['Sunlight exposure', 'Fortified foods']
               }
          ]
     }

     /**
      * Generate a nutrition plan specifically for PDF generation
      * This uses a dedicated prompt focused only on plan generation
      */
     async generateNutritionPlan(
          userProfileContext: string,
          productContext: string
     ): Promise<{ dailyCalories: number; macronutrients: { protein: { grams: number; percentage: number }; carbs: { grams: number; percentage: number }; fats: { grams: number; percentage: number } }; activityLevel: string; mealPlan: { breakfast: string[]; morningSnack?: string[]; lunch: string[]; afternoonSnack?: string[]; dinner: string[]; eveningSnack?: string[] }; supplements: Array<{ title: string; moment: string; dosage: string; duration: string; comments: string; description?: string }>; personalizedTips: string[] }> {
          // Local in-process cooldown when we hit quota / 429 errors
          if (this.quotaResetAt && this.quotaResetAt > Date.now()) {
               const remainingMs = this.quotaResetAt - Date.now()
               console.warn(`[GeminiService] In local cooldown, skipping API call. Remaining ms: ${remainingMs}`)
               throw new AIQuotaError('gemini', 'Gemini in local cooldown', remainingMs)
          }

          const systemPrompt = `You are a professional nutritionist creating a personalized nutrition plan for a client. Your task is to generate a complete nutrition plan based ONLY on the user profile data and recommended products provided.

CRITICAL RULES:
1. **Use ONLY the provided data**: Base your plan EXCLUSIVELY on the user profile and recommended products (if any) provided. Do not invent or assume information not given.
2. **Follow the exact JSON format**: You MUST return ONLY a valid JSON object in the exact format specified below. Do NOT wrap it in markdown code blocks, do NOT add any text before or after the JSON.
3. **Complete all required fields**: Every field in the JSON structure must be filled with appropriate values based on the user's profile.
4. **Product usage**: 
   - If recommended products are provided, you MUST include ALL of them in the supplements section with SHORT and BRIEF information. Do NOT skip or omit any recommended products.
   - If NO products are provided (productContext is empty), return an EMPTY supplements array: []
   - NEVER invent or suggest products when no products are provided
   - For each supplement when products ARE provided:
     * title: exact product name from the provided list
     * moment: short time indication (e.g., 'Matin', 'Soir', 'Matin et Soir'). Use line breaks (\n) if multiple times need to be on separate lines.
     * dosage: SHORT and SIMPLE (e.g., '1 gélule', '2 comprimés') - NOT a paragraph, just a simple line. If needed, use line breaks (\n) for multi-part instructions.
     * duration: short duration (e.g., '3 mois', 'En continu')
     * comments: SHORT and BRIEF - MUST include important contraindication information from the product data (e.g., "À prendre à jeun", "Ne pas prendre avec X", "Éviter si..."). Extract key safety/precaution info from contraindications and keep it concise (maximum 8-10 words per line). Use line breaks (\n) to separate multiple important points for better readability in the PDF table.
5. **Meal planning**: Create realistic, culturally appropriate meals (considering halal if relevant) for 6 meals per day: breakfast, morningSnack, lunch, afternoonSnack, dinner, eveningSnack
6. **Calorie calculation**: Estimate daily calories based on age, gender, and goals from the profile
7. **Macronutrients**: Calculate appropriate protein, carbs, and fats percentages and grams based on the user's goals
8. **Activity level**: Determine appropriate activity level based on goals and profile
9. **Personalized tips**: Provide 3-5 practical, actionable tips specific to the user's profile

RESPONSE FORMAT - Return ONLY this JSON structure (no markdown, no text before/after):
{
  "dailyCalories": number,
  "macronutrients": {
    "protein": { "grams": number, "percentage": number },
    "carbs": { "grams": number, "percentage": number },
    "fats": { "grams": number, "percentage": number }
  },
  "activityLevel": "string",
  "mealPlan": {
    "breakfast": ["string", "string"],
    "morningSnack": ["string"],
    "lunch": ["string", "string"],
    "afternoonSnack": ["string"],
    "dinner": ["string", "string"],
    "eveningSnack": ["string"]
  },
  "supplements": [
    {
      "title": "string (exact product name if from provided list)",
      "moment": "string (e.g., 'Matin', 'Soir', 'Matin et Soir')",
      "dosage": "string (e.g., '1 gélule', '2 comprimés')",
      "duration": "string (e.g., '3 mois', 'En continu')",
      "comments": "string (additional notes)",
      "description": "string (optional, product description)"
    }
  ],
  "personalizedTips": ["string", "string", "string"]
}

USER PROFILE DATA:
${userProfileContext}

${productContext ? `RECOMMENDED PRODUCTS:\n${productContext}\n\nCRITICAL: You MUST include ALL of the recommended products listed above in the supplements section. Do NOT skip, omit, or selectively choose which products to include. Every product in the RECOMMENDED PRODUCTS list must appear in the supplements array. 

For the comments field: Extract and include important contraindication information from the product data (e.g., "À prendre à jeun", "Ne pas prendre avec X", "Éviter si..."). This is critical safety information that users need to know. Keep comments SHORT and BRIEF (maximum 8-10 words per line), using line breaks (\n) to separate multiple important points.

For dosage and mode d'emploi, return SHORT and BRIEF answers - simple lines like "Prenez 1 gélule" for dosage, not paragraphs.` : 'NOTE: No products have been recommended for this user. Return an EMPTY supplements array: []. Do NOT suggest or invent any products.'}

Remember: Return ONLY the JSON object, nothing else.`

          // Try the configured model first, with limited fallback
          const modelsToTry = [this.config.model, ...this.fallbackModels.filter(m => m !== this.config.model).slice(0, 1)]

          let lastError: Error | null = null

          for (const modelName of modelsToTry) {
               try {
                    const model = this.genAI.getGenerativeModel({
                         model: modelName,
                         generationConfig: {
                              maxOutputTokens: this.config.maxOutputTokens,
                              temperature: this.config.temperature,
                         }
                    })

                    const prompt = `${systemPrompt}\n\nUser Request: Génère le plan nutritionnel personnalisé complet basé sur les données fournies.`

                    // Log input data sent to model
                    console.log('[GeminiService] Plan generation - Input data sent to model:', {
                         model: modelName,
                         userProfileContextLength: userProfileContext.length,
                         productContextLength: productContext.length,
                         hasProducts: productContext.length > 0
                    })

                    const result = await model.generateContent(prompt)
                    const response = await result.response
                    const responseContent = response.text()

                    if (!responseContent) {
                         throw new Error('No response content received from Gemini')
                    }

                    // Log output data received from model
                    console.log('[GeminiService] Plan generation - Output data received from model:', {
                         model: modelName,
                         responseLength: responseContent.length,
                         responsePreview: responseContent.substring(0, 500) + (responseContent.length > 500 ? '...' : ''),
                         fullResponse: responseContent
                    })

                    // Parse the JSON response
                    try {
                         // Clean the response content by removing markdown code blocks
                         const cleanedContent = this.cleanJsonResponse(responseContent)

                         // Check if the JSON appears to be truncated
                         if (this.isTruncatedJson(cleanedContent)) {
                              console.warn(`[GeminiService] Plan response appears truncated for model ${modelName}`)
                              if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
                                   throw new Error('Response appears to be truncated')
                              }
                         }

                         const planData = JSON.parse(cleanedContent)

                         // Validate required fields
                         if (!planData.dailyCalories || !planData.macronutrients || !planData.mealPlan || !planData.supplements || !planData.personalizedTips) {
                              throw new Error('Missing required fields in nutrition plan response')
                         }

                         console.log(`[GeminiService] Successfully generated nutrition plan with model: ${modelName}`)
                         return planData
                    } catch (parseError) {
                         console.error('[GeminiService] Failed to parse nutrition plan response:', parseError)
                         console.error('[GeminiService] Raw response:', responseContent)

                         // If this is a truncation error and we have more models to try, continue
                         if (parseError instanceof Error && parseError.message === 'Response appears to be truncated') {
                              if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
                                   lastError = parseError
                                   continue
                              }
                         }

                         // Try sanitization
                         try {
                              const cleanedContent = this.cleanJsonResponse(responseContent)
                              const sanitized = this.sanitizeJsonForParse(cleanedContent)
                              const reparsed = JSON.parse(sanitized)

                              if (!reparsed.dailyCalories || !reparsed.macronutrients || !reparsed.mealPlan || !reparsed.supplements || !reparsed.personalizedTips) {
                                   throw new Error('Missing required fields after sanitization')
                              }

                              console.log(`[GeminiService] Successfully parsed nutrition plan after sanitization for model: ${modelName}`)
                              return reparsed
                         } catch (sanitizationError) {
                              console.error('[GeminiService] Sanitized parsing also failed:', sanitizationError)
                              if (modelsToTry.indexOf(modelName) === modelsToTry.length - 1) {
                                   throw new Error('Failed to parse nutrition plan response')
                              }
                         }
                    }
               } catch (modelError) {
                    console.error(`[GeminiService] Model ${modelName} failed:`, modelError)
                    lastError = modelError instanceof Error ? modelError : new Error(String(modelError))

                    // If this is a quota / rate limit error, stop trying other models immediately
                    if (this.isQuotaError(modelError)) {
                         let retryAfterMs: number | undefined
                         const errorObj = modelError as { message?: unknown }
                         const message: string = typeof errorObj?.message === 'string'
                              ? errorObj.message
                              : ''
                         const match = message.match(/retry in (\d+(?:\.\d+)?)s/i)
                         if (match) {
                              const seconds = parseFloat(match[1])
                              if (!Number.isNaN(seconds) && seconds > 0) {
                                   retryAfterMs = seconds * 1000
                              }
                         }

                         const cooldownMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : DEFAULT_AI_COOLDOWN_MS
                         this.quotaResetAt = Date.now() + cooldownMs

                         throw new AIQuotaError('gemini', 'Gemini quota exceeded', retryAfterMs)
                    }

                    // Only continue to next model if we have more models to try and it's a truncation error
                    if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
                         const isTruncationError = lastError?.message === 'Response appears to be truncated'
                         if (isTruncationError) {
                              continue
                         }
                         break
                    }
               }
          }

          throw lastError || new Error('All Gemini models failed to generate nutrition plan')
     }

     async listAvailableModels(): Promise<Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }>> {
          try {
               const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`)
               const data = await response.json() as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> }
               return data.models || []
          } catch (error) {
               console.error('Error listing Gemini models:', error)
               return []
          }
     }
}

// Export default instances
export const openaiService = new OpenAIService({
     apiKey: process.env.OPENAI_API_KEY || '',
     model: 'gpt-4o',
     maxTokens: 1800, // Balanced limit: encourages concise responses while preventing truncation with product lists
     temperature: 0.7
})

export const geminiService = new GeminiService({
     apiKey: process.env.GEMINI_API_KEY || '',
     model: 'gemini-flash-latest',
     maxOutputTokens: 8000, // Increased to prevent truncation of JSON responses with product lists
     temperature: 0.7
})
