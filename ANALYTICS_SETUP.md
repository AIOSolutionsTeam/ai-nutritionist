# Analytics Setup Guide

This guide explains how to set up and use the Google Analytics 4 integration in the AI Nutritionist application.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Google Analytics 4 Configuration
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your_api_secret_here

# Optional: Custom Analytics Endpoint
ANALYTICS_API_KEY=your_api_key
ANALYTICS_ENDPOINT=https://your-analytics-endpoint.com/events
```

## Getting Your GA4 Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or select an existing one
3. Go to Admin → Data Streams
4. Create a new web stream or select an existing one
5. Copy the Measurement ID (starts with G-)

## Available Tracking Functions

### Core Function

```typescript
import { trackEvent } from "@/utils/analytics";

trackEvent("event_name", {
  category: "engagement",
  label: "button_click",
  value: 10,
  userId: "user_123",
});
```

### Specific Event Functions

#### 1. Chat Opened

```typescript
import { trackChatOpened } from "@/utils/analytics";

trackChatOpened("user_123", "header_button");
```

#### 2. Product Recommended

```typescript
import { trackProductRecommended } from "@/utils/analytics";

trackProductRecommended("Vitamin D3", "prod_123", "user_123", "ai_generated");
```

#### 3. Add to Cart

```typescript
import { trackAddToCart } from "@/utils/analytics";

trackAddToCart("Vitamin D3", "prod_123", 29.99, 2, "user_123");
```

#### 4. Plan Downloaded

```typescript
import { trackPlanDownloaded } from "@/utils/analytics";

trackPlanDownloaded("nutrition_plan", "plan_456", "user_123", "pdf");
```

## React Hook Usage

For React components, use the `useAnalytics` hook:

```typescript
import { useAnalytics } from "@/utils/analytics";

function MyComponent() {
  const { trackChatOpened, trackProductRecommended } = useAnalytics();

  const handleChatOpen = () => {
    trackChatOpened("user_123", "floating_widget");
  };

  const handleProductRecommendation = (product: string) => {
    trackProductRecommended(product, "prod_123", "user_123");
  };

  return (
    <div>
      <button onClick={handleChatOpen}>Open Chat</button>
      <button onClick={() => handleProductRecommendation("Vitamin D3")}>
        Recommend Product
      </button>
    </div>
  );
}
```

## Event Categories

The analytics system automatically categorizes events:

- **engagement**: User interactions (chat_opened, plan_downloaded)
- **ecommerce**: Shopping-related events (product_recommended, add_to_cart)

## Custom Parameters

All tracking functions accept custom parameters that will be sent to Google Analytics:

```typescript
trackEvent("custom_event", {
  custom_parameter_1: "value1",
  custom_parameter_2: "value2",
  userId: "user_123",
  sessionId: "session_456",
});
```

## Debug Mode

In development mode, all events are logged to the console. Set `NODE_ENV=development` to enable debug logging.

## Privacy Considerations

- User messages are truncated to 100 characters for privacy
- Personal information should not be included in event parameters
- User IDs are optional and can be hashed for additional privacy

## Testing

To test analytics in development:

1. Open browser developer tools
2. Check the Console tab for analytics event logs
3. Use Google Analytics Real-time reports to verify events
4. Check the Network tab for requests to Google Analytics

## Troubleshooting

### Events not appearing in GA4

- Verify the Measurement ID is correct
- Check that the domain is added to GA4 data streams
- Ensure events are being sent (check browser console)
- Wait up to 24 hours for data to appear in reports

### TypeScript errors

- Make sure you're importing from the correct path
- Check that environment variables are properly typed
- Verify the Window interface extensions are available

## Advanced Configuration

For custom analytics endpoints or additional tracking services, modify the `AnalyticsService` class in `src/utils/analytics.ts`.
