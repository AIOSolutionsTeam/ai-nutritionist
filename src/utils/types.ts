// User types
export interface User {
     id: string
     name: string
     email: string
     preferences: UserPreferences
     createdAt?: string
     updatedAt?: string
}

export interface UserPreferences {
     dietaryRestrictions: string[]
     healthGoals: string[]
     allergies: string[]
     age?: number
     gender?: 'male' | 'female' | 'other'
     activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
}

// Chat types
export interface ChatMessage {
     id: string
     text: string
     isUser: boolean
     timestamp: Date
     metadata?: {
          productRecommendations?: Product[]
          healthInsights?: string[]
     }
}

export interface ChatResponse {
     message: string
     timestamp: string
     recommendations?: Product[]
     followUpQuestions?: string[]
}

// Product types
export interface Product {
     id: string
     title: string
     description: string
     price: number
     currency: string
     image: string
     inStock: boolean
     category: string
     brand: string
     ingredients: string[]
     benefits: string[]
     targetAudience?: string[]
     usageInstructions?: {
          dosage?: string
          timing?: string
          duration?: string
          tips?: string[]
     }
     dosage?: string // Legacy field, kept for backward compatibility
     warnings?: string[] // Maps to contraindications
     contraindications?: string[]
}

// API types
export interface ApiResponse<T = unknown> {
     data?: T
     error?: string
     message?: string
     status: number
}

// Analytics types
export interface AnalyticsEvent {
     event: string
     properties: Record<string, string | number | boolean>
     timestamp: string
     userId?: string
}

// Email types
export interface EmailTemplate {
     to: string
     subject: string
     template: string
     data: Record<string, string | number | boolean>
}

// PDF types
export interface PDFDocument {
     title: string
     content: string
     metadata: {
          author: string
          createdAt: string
          version: string
     }
}
