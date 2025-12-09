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
               const anyError = error as any
               const status = anyError?.status
               const code = anyError?.code
               const message: string = typeof anyError?.message === 'string' ? anyError.message : ''

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
          conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
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

          // Determine if this is a continuing conversation
          const isContinuingConversation = conversationHistory && conversationHistory.length > 0
          const conversationContext = isContinuingConversation 
               ? '\n\nIMPORTANT CONVERSATION CONTEXT: This is a CONTINUING conversation. The user has already been greeted and you have been discussing topics. DO NOT greet them again with "Salut", "Bonjour", or similar greetings. Continue naturally from where the conversation left off. Be conversational and natural, as if you\'re continuing a chat with a friend.'
               : ''

          const systemPrompt = `You are a professional, friendly, and empathetic virtual nutritionist for the Vigaïa brand. Your role is to provide personalized nutrition guidance and recommend appropriate wellness products.${userContextSection}${conversationContext}

COMMUNICATION RULES:
1. **Fluid and Natural Conversation**: Reply in a warm, conversational, and fluid manner. Write as if you're having a friendly chat with a friend, not a clinical consultation. Use natural language, avoid overly formal or robotic tones.
${isContinuingConversation ? '   - **NO GREETINGS**: Since this is a continuing conversation, do NOT start with greetings like "Salut", "Bonjour", "Bien sûr", etc. Jump directly into answering their question naturally.' : ''}

2. **Informative and Educational Responses**: 
   - PRIORITIZE providing informative, educational, and detailed explanations. Your responses should be rich in information, explaining the "why" behind your advice.
   - When answering questions about supplement interactions, compatibility, timing, or general nutrition information, provide comprehensive, educational responses similar to this style:
     * Explain the science or reasoning behind your advice
     * Provide specific examples and actionable recommendations
     * Use clear structure with bullet points or sections when helpful
     * Be thorough and informative - users value learning, not just quick answers
   - Example of informative response style: "C'est exact, les interactions sont cruciales pour maximiser l'efficacité ! Le plus souvent, il s'agit d'une compétition au niveau de l'intestin pour être absorbé, ou alors un élément bloque l'action d'un autre. Pour optimiser l'absorption et ton énergie, voici les paires que je te conseille fortement d'espacer (idéalement de 2 à 4 heures) : [detailed explanation with examples]"
   - When the question is informational/educational (about interactions, compatibility, benefits, timing, etc.), focus on providing valuable information WITHOUT recommending specific products. Set "products" to an empty array [].

3. **Clarity and Understanding**: 
   - If you don't fully understand the user's question or need, REFRAME it back to them and ask for clarification in a friendly way.
   - Example: "Je veux m'assurer de bien comprendre - vous cherchez des produits pour améliorer votre énergie au quotidien, c'est bien ça?"
   - Never guess or assume. It's better to ask than to give incorrect advice.

4. **Refine and Reform Answers**: 
   - If your initial response could be clearer or more helpful, refine it before responding.
   - Ensure your advice is well-structured, easy to understand, and actionable.
   - Break down complex information into digestible, friendly explanations.

5. **Product Recommendations - ONLY When Explicitly Requested**:
   - **CRITICAL**: Products should ONLY be recommended when the user EXPLICITLY asks for products, supplements, or product lists. For informational/educational questions, NEVER recommend products.
   - When the user EXPLICITLY asks for products using phrases like "lister", "liste", "donner moi", "montre moi", "produit", "produits", "complément", "supplément" - IMMEDIATELY provide products WITHOUT long explanations first. Be direct and action-oriented.
   - ONLY recommend products when:
     * The user EXPLICITLY asks about products, supplements, or lists (e.g., "lister moi des produits", "quels produits recommandez-vous?")
     * The user explicitly wants to purchase something (e.g., "Je cherche un complément pour...", "Avez-vous un produit pour...")
   - **NEVER recommend products for informational questions**:
     * Questions about interactions: "Quels compléments éviter ensemble?", "Peut-on prendre X et Y ensemble?"
     * Questions about compatibility: "Le fer et le calcium sont-ils compatibles?"
     * Questions about timing: "Quand prendre le magnésium?"
     * Questions about benefits: "Quels sont les bienfaits du magnésium?"
     * General information: "Expliquez-moi...", "Qu'est-ce que...", "Parlez-moi de..."
     * General advice: "Comment améliorer mon sommeil?", "Quels aliments manger?"
   - For informational questions, provide comprehensive, educational responses WITHOUT products. Set "products" to an empty array [].
   - **CRITICAL**: When user asks for a product list, start with a BRIEF introduction (1-2 sentences max), then IMMEDIATELY list the products. Do NOT give long explanations before listing products.
   - Don't force product recommendations. Quality over quantity.
   - When you DO recommend products, explain WHY each product is suitable for their specific situation, but keep explanations concise when the user explicitly asked for a list.
   - IMPORTANT: If you're not sure whether to recommend products, DON'T. It's better to provide informative advice without products than to recommend unnecessarily.

6. **Product Combinations**:
   - After presenting individual products, suggest complementary products that work well together.
   - Explain how products can be combined for synergistic benefits.
   - Example: "Ces produits se complètent bien ensemble: [Product A] améliore l'absorption de [Product B], ce qui maximise leurs bienfaits."

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

               // Add conversation history if available
               if (conversationHistory && conversationHistory.length > 0) {
                    // Add previous messages (limit to last 10 messages to avoid token limits)
                    const recentHistory = conversationHistory.slice(-10)
                    for (const msg of recentHistory) {
                         messages.push({
                              role: msg.role === 'assistant' ? 'assistant' : 'user',
                              content: msg.content
                         })
                    }
               }

               // Add current user query
               messages.push({
                    role: 'user',
                    content: userQuery
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

               // Parse the JSON response
               try {
                    const parsedResponse = JSON.parse(responseContent)

                    // Validate the response structure
                    if (!parsedResponse.reply || !Array.isArray(parsedResponse.products)) {
                         throw new Error('Invalid response structure')
                    }

                    return parsedResponse as StructuredNutritionResponse
               } catch (parseError) {
                    console.error('Failed to parse OpenAI response as JSON:', parseError)
                    console.error('Raw response:', responseContent)

                    // Fallback to a structured response if JSON parsing fails
                    return {
                         reply: responseContent,
                         products: [],
                         disclaimer: 'Please consult with a healthcare professional before starting any new supplement regimen.'
                    }
               }
          } catch (error) {
               console.error('OpenAI API error:', error)

               // Detect quota / rate limit errors (429 or insufficient_quota)
               const anyError = error as any
               const status = anyError?.status
               const code = anyError?.code
               const message: string = typeof anyError?.message === 'string' ? anyError.message : ''

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
                    const headers = anyError?.headers as Record<string, string> | undefined
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
}

export class GeminiService {
     private genAI: GoogleGenerativeAI
     private config: GeminiConfig
     private fallbackModels = ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-flash-latest']
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
          const anyErr = error as any
          if (!anyErr) return false

          if (anyErr.status === 429) {
               return true
          }

          const message: string = typeof anyErr.message === 'string' ? anyErr.message : ''
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
          conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
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

          // Determine if this is a continuing conversation
          const isContinuingConversation = conversationHistory && conversationHistory.length > 0
          const conversationContext = isContinuingConversation 
               ? '\n\nIMPORTANT CONVERSATION CONTEXT: This is a CONTINUING conversation. The user has already been greeted and you have been discussing topics. DO NOT greet them again with "Salut", "Bonjour", or similar greetings. Continue naturally from where the conversation left off. Be conversational and natural, as if you\'re continuing a chat with a friend.'
               : ''

          const systemPrompt = `You are a professional, friendly, and empathetic virtual nutritionist for the Vigaïa brand. Your role is to provide personalized nutrition guidance and recommend appropriate wellness products.${userContextSection}${conversationContext}

COMMUNICATION RULES:
1. **Fluid and Natural Conversation**: Reply in a warm, conversational, and fluid manner. Write as if you're having a friendly chat with a friend, not a clinical consultation. Use natural language, avoid overly formal or robotic tones.
${isContinuingConversation ? '   - **NO GREETINGS**: Since this is a continuing conversation, do NOT start with greetings like "Salut", "Bonjour", "Bien sûr", etc. Jump directly into answering their question naturally.' : ''}

2. **Informative and Educational Responses**: 
   - PRIORITIZE providing informative, educational, and detailed explanations. Your responses should be rich in information, explaining the "why" behind your advice.
   - When answering questions about supplement interactions, compatibility, timing, or general nutrition information, provide comprehensive, educational responses similar to this style:
     * Explain the science or reasoning behind your advice
     * Provide specific examples and actionable recommendations
     * Use clear structure with bullet points or sections when helpful
     * Be thorough and informative - users value learning, not just quick answers
   - Example of informative response style: "C'est exact, les interactions sont cruciales pour maximiser l'efficacité ! Le plus souvent, il s'agit d'une compétition au niveau de l'intestin pour être absorbé, ou alors un élément bloque l'action d'un autre. Pour optimiser l'absorption et ton énergie, voici les paires que je te conseille fortement d'espacer (idéalement de 2 à 4 heures) : [detailed explanation with examples]"
   - When the question is informational/educational (about interactions, compatibility, benefits, timing, etc.), focus on providing valuable information WITHOUT recommending specific products. Set "products" to an empty array [].

3. **Clarity and Understanding**: 
   - If you don't fully understand the user's question or need, REFRAME it back to them and ask for clarification in a friendly way.
   - Example: "Je veux m'assurer de bien comprendre - vous cherchez des produits pour améliorer votre énergie au quotidien, c'est bien ça?"
   - Never guess or assume. It's better to ask than to give incorrect advice.

4. **Refine and Reform Answers**: 
   - If your initial response could be clearer or more helpful, refine it before responding.
   - Ensure your advice is well-structured, easy to understand, and actionable.
   - Break down complex information into digestible, friendly explanations.

5. **Product Recommendations - ONLY When Explicitly Requested**:
   - **CRITICAL**: Products should ONLY be recommended when the user EXPLICITLY asks for products, supplements, or product lists. For informational/educational questions, NEVER recommend products.
   - When the user EXPLICITLY asks for products using phrases like "lister", "liste", "donner moi", "montre moi", "produit", "produits", "complément", "supplément" - IMMEDIATELY provide products WITHOUT long explanations first. Be direct and action-oriented.
   - ONLY recommend products when:
     * The user EXPLICITLY asks about products, supplements, or lists (e.g., "lister moi des produits", "quels produits recommandez-vous?")
     * The user explicitly wants to purchase something (e.g., "Je cherche un complément pour...", "Avez-vous un produit pour...")
   - **NEVER recommend products for informational questions**:
     * Questions about interactions: "Quels compléments éviter ensemble?", "Peut-on prendre X et Y ensemble?"
     * Questions about compatibility: "Le fer et le calcium sont-ils compatibles?"
     * Questions about timing: "Quand prendre le magnésium?"
     * Questions about benefits: "Quels sont les bienfaits du magnésium?"
     * General information: "Expliquez-moi...", "Qu'est-ce que...", "Parlez-moi de..."
     * General advice: "Comment améliorer mon sommeil?", "Quels aliments manger?"
   - For informational questions, provide comprehensive, educational responses WITHOUT products. Set "products" to an empty array [].
   - **CRITICAL**: When user asks for a product list, start with a BRIEF introduction (1-2 sentences max), then IMMEDIATELY list the products. Do NOT give long explanations before listing products.
   - Don't force product recommendations. Quality over quantity.
   - When you DO recommend products, explain WHY each product is suitable for their specific situation, but keep explanations concise when the user explicitly asked for a list.
   - IMPORTANT: If you're not sure whether to recommend products, DON'T. It's better to provide informative advice without products than to recommend unnecessarily.

6. **Product Combinations**:
   - After presenting individual products, suggest complementary products that work well together.
   - Explain how products can be combined for synergistic benefits.
   - Example: "Ces produits se complètent bien ensemble: [Product A] améliore l'absorption de [Product B], ce qui maximise leurs bienfaits."

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

          // Build conversation context for Gemini
          let conversationContextText = ''
          if (conversationHistory && conversationHistory.length > 0) {
               const recentHistory = conversationHistory.slice(-10) // Limit to last 10 messages
               conversationContextText = '\n\nCONVERSATION HISTORY:\n'
               for (const msg of recentHistory) {
                    conversationContextText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
               }
          }

          // Try the configured model first, then fallback models
          const modelsToTry = [this.config.model, ...this.fallbackModels.filter(m => m !== this.config.model)]

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
                    const result = await model.generateContent(prompt)
                    const response = await result.response
                    const responseContent = response.text()

                    if (!responseContent) {
                         throw new Error('No response content received from Gemini')
                    }

                    // Parse the JSON response
                    try {
                         // Clean the response content by removing markdown code blocks
                         const cleanedContent = this.cleanJsonResponse(responseContent)

                         // Check if the JSON appears to be truncated
                         if (this.isTruncatedJson(cleanedContent)) {
                              console.warn(`Gemini response appears truncated for model ${modelName}`)
                              throw new Error('Response appears to be truncated')
                         }

                         const parsedResponse = JSON.parse(cleanedContent)

                         // Validate the response structure
                         if (!parsedResponse.reply || !Array.isArray(parsedResponse.products)) {
                              throw new Error('Invalid response structure')
                         }

                         console.log(`Successfully used Gemini model: ${modelName}`)
                         return parsedResponse as StructuredNutritionResponse
                    } catch (parseError) {
                         console.error('Failed to parse Gemini response as JSON:', parseError)
                         console.error('Raw response:', responseContent)

                         // If this is a truncation error, try the next model
                         if (parseError instanceof Error && parseError.message === 'Response appears to be truncated') {
                              throw parseError
                         }

                         // Try a sanitization pass and parse again
                         try {
                              const cleanedContent = this.cleanJsonResponse(responseContent)
                              const sanitized = this.sanitizeJsonForParse(cleanedContent)
                              const reparsed = JSON.parse(sanitized)

                              if (!reparsed.reply || !Array.isArray(reparsed.products)) {
                                   throw new Error('Invalid response structure after sanitization')
                              }

                              console.log(`Successfully parsed Gemini response after sanitization for model: ${modelName}`)
                              return reparsed as StructuredNutritionResponse
                         } catch (sanitizationError) {
                              console.error('Sanitized parsing also failed:', sanitizationError)
                         }

                         // Fallback to a structured response if JSON parsing fails
                         return {
                              reply: responseContent,
                              products: [],
                              disclaimer: 'Please consult with a healthcare professional before starting any new supplement regimen.'
                         }
                    }
               } catch (modelError) {
                    console.error(`Gemini model ${modelName} failed:`, modelError)

                    // If this is a quota / rate limit error, stop trying other models
                    if (this.isQuotaError(modelError)) {
                         let retryAfterMs: number | undefined
                         const message: string = typeof (modelError as any)?.message === 'string'
                              ? (modelError as any).message
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

                    // Continue to next model for non‑quota errors
                    continue
               }
          }

          // If all models failed
          throw new Error('All Gemini models failed to generate response')
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
     maxTokens: 2000, // Increased from 500 to allow complete responses with product lists
     temperature: 0.7
})

export const geminiService = new GeminiService({
     apiKey: process.env.GEMINI_API_KEY || '',
     model: 'gemini-flash-latest',
     maxOutputTokens: 4000, // Increased from 2000 to allow complete responses with product lists
     temperature: 0.7
})
