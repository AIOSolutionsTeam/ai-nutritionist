// Analytics service for tracking user interactions and app metrics
export interface AnalyticsEvent {
     event: string
     properties: Record<string, string | number | boolean>
     timestamp: string
     userId?: string
     sessionId?: string
}

// Google Analytics 4 event interface
export interface GA4Event {
     name: string
     parameters?: Record<string, string | number | boolean>
}

// Extend Window interface for Google Analytics
declare global {
     interface Window {
          dataLayer: unknown[]
          gtag: (...args: unknown[]) => void
     }
}

export interface AnalyticsConfig {
     apiKey?: string
     endpoint?: string
     debug?: boolean
     ga4MeasurementId?: string
     ga4ApiSecret?: string
}

export interface UserMetrics {
     totalSessions: number
     averageSessionDuration: number
     totalMessages: number
     favoriteSupplements: string[]
     healthGoals: string[]
}

export class AnalyticsService {
     private config: AnalyticsConfig
     private sessionId: string

     constructor(config: AnalyticsConfig = {}) {
          this.config = {
               endpoint: 'https://api.analytics.example.com',
               debug: false,
               ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
               ga4ApiSecret: process.env.GA4_API_SECRET,
               ...config
          }
          this.sessionId = this.generateSessionId()
          this.initializeGA4()
     }

     // Initialize Google Analytics 4
     private initializeGA4(): void {
          if (typeof window !== 'undefined' && this.config.ga4MeasurementId) {
               // Load Google Analytics script
               const script = document.createElement('script')
               script.async = true
               script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.ga4MeasurementId}`
               document.head.appendChild(script)

               // Initialize gtag
               window.dataLayer = window.dataLayer || []
               function gtag(...args: unknown[]) {
                    window.dataLayer.push(...args)
               }
               gtag('js', new Date())
               gtag('config', this.config.ga4MeasurementId, {
                    page_title: document.title,
                    page_location: window.location.href
               })

                    // Make gtag available globally
                    window.gtag = gtag
          }
     }

     // Main trackEvent function for Google Analytics
     async trackEvent(eventName: string, data: Record<string, string | number | boolean> = {}): Promise<void> {
          try {
               if (this.config.debug) {
                    console.log('Analytics Event:', { eventName, data })
               }

               // Track with Google Analytics 4
               if (typeof window !== 'undefined' && window.gtag) {
                    window.gtag('event', eventName, {
                         event_category: data.category || 'engagement',
                         event_label: data.label,
                         value: data.value,
                         custom_parameters: data,
                         session_id: this.sessionId,
                         timestamp: new Date().toISOString(),
                         ...data
                    })
               }

               // Also track with our internal analytics
               // Extract userId from data and ensure it's a string
               const userId = typeof data.userId === 'string' ? data.userId : undefined
               // eslint-disable-next-line @typescript-eslint/no-unused-vars
               const { userId: _userId, ...properties } = data // Remove userId from properties to avoid duplication
               
               const eventData: AnalyticsEvent = {
                    event: eventName,
                    properties,
                    timestamp: new Date().toISOString(),
                    sessionId: this.sessionId,
                    ...(userId && { userId })
               }

               // Send to our analytics endpoint if configured
               if (this.config.endpoint && this.config.apiKey) {
                    await this.sendToAnalyticsEndpoint(eventData)
               }

               console.log('Event tracked:', eventName, data)
          } catch (error) {
               console.error('Analytics tracking error:', error)
          }
     }

     // Send event to custom analytics endpoint
     private async sendToAnalyticsEndpoint(eventData: AnalyticsEvent): Promise<void> {
          try {
               const response = await fetch(this.config.endpoint!, {
                    method: 'POST',
                    headers: {
                         'Content-Type': 'application/json',
                         'Authorization': `Bearer ${this.config.apiKey}`
                    },
                    body: JSON.stringify(eventData)
               })

               if (!response.ok) {
                    throw new Error(`Analytics endpoint error: ${response.status}`)
               }
          } catch (error) {
               console.error('Failed to send to analytics endpoint:', error)
          }
     }

     trackPageView(page: string, properties: Record<string, string | number | boolean> = {}): void {
          this.trackEvent('page_view', {
               page,
               ...properties
          })
     }

     trackChatMessage(message: string, isUser: boolean, userId?: string): void {
          this.trackEvent('chat_message', {
               message: message.substring(0, 100), // Truncate for privacy
               isUser,
               messageLength: message.length,
               ...(userId && { userId })
          })
     }

     trackSupplementRecommendation(supplement: string, userId?: string): void {
          this.trackEvent('supplement_recommendation', {
               supplement,
               recommendationType: 'ai_generated',
               ...(userId && { userId })
          })
     }

     trackUserRegistration(userId: string, properties: Record<string, string | number | boolean> = {}): void {
          this.trackEvent('user_registration', {
               ...properties,
               userId
          })
     }

     trackUserLogin(userId: string, method: string = 'email'): void {
          this.trackEvent('user_login', {
               loginMethod: method,
               userId
          })
     }

     trackError(error: string, context: Record<string, string | number | boolean> = {}): void {
          this.trackEvent('error', {
               error,
               ...context
          })
     }

     // Specific event tracking functions for Google Analytics

     /**
      * Track when chat widget is opened
      */
     trackChatOpened(userId?: string, source?: string): void {
          this.trackEvent('chat_opened', {
               category: 'engagement',
               label: source || 'unknown',
               ...(userId && { userId }),
               ...(source && { source })
          })
     }

     /**
      * Track when a product is recommended
      */
     trackProductRecommended(productName: string, productId?: string, userId?: string, recommendationType?: string): void {
          this.trackEvent('product_recommended', {
               category: 'ecommerce',
               product_name: productName,
               ...(productId && { product_id: productId }),
               recommendation_type: recommendationType || 'ai_generated',
               ...(userId && { userId })
          })
     }

     /**
      * Track when user adds item to cart
      */
     trackAddToCart(productName: string, productId?: string, price?: number, quantity: number = 1, userId?: string): void {
          this.trackEvent('add_to_cart', {
               category: 'ecommerce',
               product_name: productName,
               ...(productId && { product_id: productId }),
               ...(price !== undefined && { price }),
               quantity,
               ...(price !== undefined && { value: price * quantity }),
               ...(userId && { userId })
          })
     }

     /**
      * Track when nutrition plan is downloaded
      */
     trackPlanDownloaded(planType: string, planId?: string, userId?: string, format?: string): void {
          this.trackEvent('plan_downloaded', {
               category: 'engagement',
               plan_type: planType,
               ...(planId && { plan_id: planId }),
               format: format || 'pdf',
               ...(userId && { userId })
          })
     }

     // eslint-disable-next-line @typescript-eslint/no-unused-vars
     async getUserMetrics(_userId: string): Promise<UserMetrics> {
          try {
               // TODO: Implement actual metrics retrieval
               return {
                    totalSessions: 0,
                    averageSessionDuration: 0,
                    totalMessages: 0,
                    favoriteSupplements: [],
                    healthGoals: []
               }
          } catch (error) {
               console.error('Error fetching user metrics:', error)
               throw error
          }
     }

     private generateSessionId(): string {
          return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
     }
}

// Export a default instance
export const analytics = new AnalyticsService({
     apiKey: process.env.ANALYTICS_API_KEY,
     endpoint: process.env.ANALYTICS_ENDPOINT,
     debug: process.env.NODE_ENV === 'development',
     ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID,
     ga4ApiSecret: process.env.GA4_API_SECRET
})

// React hook for easy analytics tracking
export function useAnalytics() {
     return {
          trackEvent: analytics.trackEvent.bind(analytics),
          trackPageView: analytics.trackPageView.bind(analytics),
          trackChatMessage: analytics.trackChatMessage.bind(analytics),
          trackSupplementRecommendation: analytics.trackSupplementRecommendation.bind(analytics),
          trackUserRegistration: analytics.trackUserRegistration.bind(analytics),
          trackUserLogin: analytics.trackUserLogin.bind(analytics),
          trackError: analytics.trackError.bind(analytics),
          // New specific event tracking functions
          trackChatOpened: analytics.trackChatOpened.bind(analytics),
          trackProductRecommended: analytics.trackProductRecommended.bind(analytics),
          trackAddToCart: analytics.trackAddToCart.bind(analytics),
          trackPlanDownloaded: analytics.trackPlanDownloaded.bind(analytics)
     }
}

// Direct exports for easy access
export const trackEvent = analytics.trackEvent.bind(analytics)
export const trackChatOpened = analytics.trackChatOpened.bind(analytics)
export const trackProductRecommended = analytics.trackProductRecommended.bind(analytics)
export const trackAddToCart = analytics.trackAddToCart.bind(analytics)
export const trackPlanDownloaded = analytics.trackPlanDownloaded.bind(analytics)
