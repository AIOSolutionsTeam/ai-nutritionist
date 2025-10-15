// Example usage of the analytics tracking functions
import {
     trackEvent,
     trackChatOpened,
     trackProductRecommended,
     trackAddToCart,
     trackPlanDownloaded,
     analytics
} from '../src/utils/analytics'

// Example 1: Track when chat widget is opened
export function handleChatOpen(userId?: string) {
     trackChatOpened(userId, 'header_button')
     // This will send a 'chat_opened' event to Google Analytics
}

// Example 2: Track product recommendations
export function handleProductRecommendation(productName: string, userId?: string) {
     trackProductRecommended(productName, 'prod_123', userId, 'ai_generated')
     // This will send a 'product_recommended' event with product details
}

// Example 3: Track add to cart events
export function handleAddToCart(productName: string, price: number, userId?: string) {
     trackAddToCart(productName, 'prod_123', price, 1, userId)
     // This will send an 'add_to_cart' event with ecommerce data
}

// Example 4: Track plan downloads
export function handlePlanDownload(planType: string, userId?: string) {
     trackPlanDownloaded(planType, 'plan_456', userId, 'pdf')
     // This will send a 'plan_downloaded' event
}

// Example 5: Custom event tracking
export function handleCustomEvent() {
     trackEvent('custom_interaction', {
          category: 'user_engagement',
          action: 'button_click',
          label: 'special_offer',
          value: 10
     })
}

// Example 6: Using the analytics service directly
export function handleAdvancedTracking() {
     // Track multiple events
     analytics.trackChatOpened('user_123', 'floating_widget')
     analytics.trackProductRecommended('Vitamin D3', 'vit_d3_001', 'user_123', 'ai_recommendation')
     analytics.trackAddToCart('Vitamin D3', 'vit_d3_001', 29.99, 2, 'user_123')
}

// Example 7: Error tracking
export function handleError(error: Error, context: string) {
     analytics.trackError(error.message, {
          context,
          stack: error.stack,
          timestamp: new Date().toISOString()
     })
}

// Example 8: Page view tracking
export function handlePageView(pageName: string) {
     analytics.trackPageView(pageName, {
          referrer: document.referrer,
          user_agent: navigator.userAgent
     })
}
