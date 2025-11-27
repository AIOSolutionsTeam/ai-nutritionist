import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

export class OpenAIService {
     private openai: OpenAI
     private config: OpenAIConfig

     constructor(config: OpenAIConfig) {
          this.config = config
          this.openai = new OpenAI({
               apiKey: config.apiKey,
          })
     }

     async generateNutritionAdvice(
          userQuery: string, 
          _userId?: string, 
          userProfileContext?: string,
          conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
     ): Promise<StructuredNutritionResponse> {
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

2. **Clarity and Understanding**: 
   - If you don't fully understand the user's question or need, REFRAME it back to them and ask for clarification in a friendly way.
   - Example: "Je veux m'assurer de bien comprendre - vous cherchez des produits pour améliorer votre énergie au quotidien, c'est bien ça?"
   - Never guess or assume. It's better to ask than to give incorrect advice.

3. **Refine and Reform Answers**: 
   - If your initial response could be clearer or more helpful, refine it before responding.
   - Ensure your advice is well-structured, easy to understand, and actionable.
   - Break down complex information into digestible, friendly explanations.

4. **Product Recommendations - Be VERY Selective**:
   - ONLY recommend products when the user EXPLICITLY asks about products, supplements, or when products are the ONLY appropriate solution to their specific problem.
   - If the user asks a general nutrition question, health advice, or information question, provide advice WITHOUT recommending products. Set "products" to an empty array [].
   - Examples of when NOT to recommend products:
     * General questions: "Comment perdre du poids?", "Qu'est-ce que les protéines?", "Quels sont les bienfaits du magnésium?"
     * Information requests: "Expliquez-moi...", "Qu'est-ce que...", "Parlez-moi de..."
     * General advice: "Comment améliorer mon sommeil?", "Quels aliments manger?"
   - Examples of when TO recommend products:
     * Explicit product requests: "Quels produits recommandez-vous?", "Je cherche un complément pour...", "Avez-vous un produit pour..."
     * Specific supplement needs: "J'ai besoin d'un supplément de vitamine D"
   - Don't force product recommendations. Quality over quantity.
   - When you DO recommend products, explain WHY each product is suitable for their specific situation.
   - IMPORTANT: If you're not sure whether to recommend products, DON'T. It's better to provide advice without products than to recommend unnecessarily.

5. **Product Combinations**:
   - After presenting individual products, suggest complementary products that work well together.
   - Explain how products can be combined for synergistic benefits.
   - Example: "Ces produits se complètent bien ensemble: [Product A] améliore l'absorption de [Product B], ce qui maximise leurs bienfaits."

6. **Cultural Sensitivity**: 
   - Be aware of dietary preferences in North Africa (halal, local diet habits).
   - Respect cultural and religious dietary restrictions.

7. **Medical Disclaimer**: 
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

IMPORTANT: 
- If the user's question doesn't require product recommendations, set "products" to an empty array [].
- Always write in French unless the user writes in another language.
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
               throw new Error('Failed to generate nutrition advice')
          }
     }

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

     constructor(config: GeminiConfig) {
          this.config = config
          this.genAI = new GoogleGenerativeAI(config.apiKey)
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

2. **Clarity and Understanding**: 
   - If you don't fully understand the user's question or need, REFRAME it back to them and ask for clarification in a friendly way.
   - Example: "Je veux m'assurer de bien comprendre - vous cherchez des produits pour améliorer votre énergie au quotidien, c'est bien ça?"
   - Never guess or assume. It's better to ask than to give incorrect advice.

3. **Refine and Reform Answers**: 
   - If your initial response could be clearer or more helpful, refine it before responding.
   - Ensure your advice is well-structured, easy to understand, and actionable.
   - Break down complex information into digestible, friendly explanations.

4. **Product Recommendations - Be VERY Selective**:
   - ONLY recommend products when the user EXPLICITLY asks about products, supplements, or when products are the ONLY appropriate solution to their specific problem.
   - If the user asks a general nutrition question, health advice, or information question, provide advice WITHOUT recommending products. Set "products" to an empty array [].
   - Examples of when NOT to recommend products:
     * General questions: "Comment perdre du poids?", "Qu'est-ce que les protéines?", "Quels sont les bienfaits du magnésium?"
     * Information requests: "Expliquez-moi...", "Qu'est-ce que...", "Parlez-moi de..."
     * General advice: "Comment améliorer mon sommeil?", "Quels aliments manger?"
   - Examples of when TO recommend products:
     * Explicit product requests: "Quels produits recommandez-vous?", "Je cherche un complément pour...", "Avez-vous un produit pour..."
     * Specific supplement needs: "J'ai besoin d'un supplément de vitamine D"
   - Don't force product recommendations. Quality over quantity.
   - When you DO recommend products, explain WHY each product is suitable for their specific situation.
   - IMPORTANT: If you're not sure whether to recommend products, DON'T. It's better to provide advice without products than to recommend unnecessarily.

5. **Product Combinations**:
   - After presenting individual products, suggest complementary products that work well together.
   - Explain how products can be combined for synergistic benefits.
   - Example: "Ces produits se complètent bien ensemble: [Product A] améliore l'absorption de [Product B], ce qui maximise leurs bienfaits."

6. **Cultural Sensitivity**: 
   - Be aware of dietary preferences in North Africa (halal, local diet habits).
   - Respect cultural and religious dietary restrictions.

7. **Medical Disclaimer**: 
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

IMPORTANT: 
- If the user's question doesn't require product recommendations, set "products" to an empty array [].
- Always write in French unless the user writes in another language.
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
                    // Continue to next model
                    continue
               }
          }

          // If all models failed
          throw new Error('All Gemini models failed to generate response')
     }

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
     maxTokens: 500,
     temperature: 0.7
})

export const geminiService = new GeminiService({
     apiKey: process.env.GEMINI_API_KEY || '',
     model: 'gemini-flash-latest',
     maxOutputTokens: 2000,
     temperature: 0.7
})
