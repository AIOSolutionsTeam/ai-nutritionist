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
     recommendedProducts?: any[] // Will be populated by the chat API with Shopify products
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

     async generateNutritionAdvice(userQuery: string, userId?: string): Promise<StructuredNutritionResponse> {
          const systemPrompt = `You are a nutrition assistant that helps recommend healthy supplements. 

IMPORTANT: You must respond with ONLY a valid JSON object in the following format. Do NOT wrap it in markdown code blocks or any other formatting:
{
  "reply": "Your personalized nutrition advice and explanation",
  "products": [
    {
      "name": "Product name",
      "category": "Category (e.g., Vitamins, Minerals, Herbs)",
      "description": "Brief description of the product",
      "benefits": ["benefit 1", "benefit 2"],
      "dosage": "Recommended dosage (optional)",
      "timing": "When to take (optional)",
      "interactions": ["potential interaction 1"] (optional)
    }
  ],
  "disclaimer": "Always include a disclaimer about consulting healthcare professionals (optional)"
}

Provide helpful, evidence-based advice about nutrition and supplements. Always recommend consulting with a healthcare professional for personalized advice.`

          try {
               const completion = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages: [
                         {
                              role: 'system',
                              content: systemPrompt
                         },
                         {
                              role: 'user',
                              content: userQuery
                         }
                    ],
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

     async getSupplementRecommendations(userProfile: any): Promise<NutritionRecommendation[]> {
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

     async generateNutritionAdvice(userQuery: string, userId?: string): Promise<StructuredNutritionResponse> {
          const systemPrompt = `You are a virtual nutritionist for the Vigaïa brand.
Your goal is to guide users toward the most suitable nutrition and wellness products from the Shopify catalog. 
Always reply in a friendly, helpful tone.
Your response should include ONLY valid JSON in this format:
{
  "reply": "Brief personalized nutrition advice",
  "products": [
    {
      "name": "Product name",
      "category": "Category",
      "description": "Brief description",
      "benefits": ["benefit 1", "benefit 2"],
      "dosage": "Recommended dosage",
      "timing": "When to take",
      "interactions": ["potential interaction"]
    }
  ],
  "disclaimer": "Consult healthcare professionals"
}

Be culturally aware of dietary preferences in North Africa (halal, local diet habits).
Never provide medical diagnoses. Include a disclaimer when needed.`

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

                    const prompt = `${systemPrompt}\n\nUser Question: ${userQuery}`
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

     async getSupplementRecommendations(userProfile: any): Promise<NutritionRecommendation[]> {
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

     async listAvailableModels(): Promise<any[]> {
          try {
               const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`)
               const data = await response.json()
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
