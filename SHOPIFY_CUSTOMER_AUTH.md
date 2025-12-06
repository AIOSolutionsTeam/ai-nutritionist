# Shopify Customer Authentication Integration

This document describes the Shopify customer authentication integration implemented for the AI Nutritionist application.

## Overview

When a user clicks "Commencer ma consultation" (Start my consultation), the application now:

1. Checks if there's a logged-in Shopify customer
2. If yes, retrieves the customer ID and name
3. Saves them to the user profile schema
4. Uses the Shopify customer ID as the userId
5. Continues with the normal consultation flow

If no user is logged in, the application continues as usual with an anonymous user ID.

## Implementation Details

### 1. Database Schema Updates

The `UserProfile` schema has been extended with optional Shopify customer fields:

- `shopifyCustomerId` (String, optional, indexed)
- `shopifyCustomerName` (String, optional)

These fields are automatically populated when a Shopify customer is detected.

### 2. Shopify App Proxy Integration

The integration works via Shopify App Proxy, which passes customer information through:

- Query parameters: `customer_id`, `customer_name`, `customer_email`
- Headers: `X-Shopify-Customer-Id`, `X-Shopify-Customer-Name`, `X-Shopify-Customer-Email`

### 3. API Endpoints

#### `/api/shopify/customer` (GET)

- Checks for logged-in Shopify customer
- Extracts customer info from request (app proxy or headers)
- Optionally verifies app proxy signature
- Fetches full customer details from Shopify Admin API if needed
- Creates or updates user profile with Shopify customer info
- Returns customer information or null if not logged in

#### Updated `/api/user` (POST)

- Now accepts and saves Shopify customer info when creating/updating profiles
- Preserves existing Shopify customer info when updating

### 4. Frontend Updates

The `FullPageChat` component now:

- Checks for Shopify customer on initialization
- Uses Shopify customer ID as userId if available
- Personalizes greeting with customer name if logged in
- Falls back to anonymous user ID if no Shopify customer detected

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Shopify Store Configuration
SHOPIFY_STORE_DOMAIN=your-store-name.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token

# Shopify Admin API (for fetching customer details)
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_your_admin_access_token

# Shopify App Proxy Secret (optional, for signature verification)
SHOPIFY_APP_PROXY_SECRET=your-app-proxy-secret
```

### Getting Your Shopify Admin Access Token

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → Create a custom app (or use existing)
3. Configure Admin API scopes:
   - `read_customers` (to fetch customer details)
4. Install the app
5. Go to "API credentials" tab
6. Under "Admin API access token", click "Reveal token once"
7. Copy the token (starts with `shpat_`)

**Note:** The admin token provided:  should be set as `SHOPIFY_ADMIN_ACCESS_TOKEN` in your environment variables.

## Shopify App Proxy Setup

To enable customer authentication via App Proxy:

1. **In Shopify Admin:**

   - Go to Settings → Apps and sales channels
   - Click "Develop apps" → Your app
   - Go to "App proxy" section
   - Add a new proxy:
     - **Subpath prefix:** `nutritionniste` (or your preferred path)
     - **Subpath:** `*` (wildcard to match all paths)
     - **Proxy URL:** `https://your-deployed-app.com/api/shopify/proxy`
     - **Secret:** Set a secret and add it to `SHOPIFY_APP_PROXY_SECRET`
2. **App Proxy URL Format:**
   When configured, your app will be accessible at:

   ```
   https://your-store.myshopify.com/apps/nutritionniste/*
   ```

   This will proxy to your Next.js application.
3. **Customer Information:**
   Shopify automatically includes customer information in the request when:

   - Customer is logged into the Shopify store
   - Request comes through the app proxy

## How It Works

### Flow Diagram

```
User clicks "Commencer ma consultation"
         ↓
FullPageChat initializes
         ↓
Calls /api/shopify/customer
         ↓
    ┌────┴────┐
    │         │
Shopify    No Shopify
Customer   Customer
    │         │
    │         └─→ Generate anonymous userId
    │             Continue with normal flow
    │
    └─→ Extract customer ID & name
        ↓
    Save to UserProfile
        ↓
    Use shopify_{customerId} as userId
        ↓
    Continue with personalized greeting
```

### Example Scenarios

#### Scenario 1: Logged-in Shopify Customer

1. Customer is logged into Shopify store
2. Clicks "Commencer ma consultation"
3. App detects customer ID: `123456789`
4. App detects customer name: `John Doe`
5. Creates/updates profile with `userId: shopify_123456789`
6. Greeting: "Bonjour John Doe! 👋 ..."

#### Scenario 2: Not Logged In

1. User is not logged into Shopify
2. Clicks "Commencer ma consultation"
3. App generates anonymous userId: `user_1234567890_abc123`
4. Greeting: "Bonjour! 👋 ..."
5. Normal onboarding flow continues

## Files Modified/Created

### Created Files:

- `src/lib/shopify-auth.ts` - Shopify authentication utilities
- `src/app/api/shopify/customer/route.ts` - Customer authentication endpoint
- `SHOPIFY_CUSTOMER_AUTH.md` - This documentation

### Modified Files:

- `src/lib/db.ts` - Added Shopify customer fields to schema
- `src/components/FullPageChat.tsx` - Added Shopify customer check on init
- `src/app/api/user/route.ts` - Added Shopify customer info handling

## Testing

### Test with Shopify Customer:

1. Log into your Shopify store as a customer
2. Navigate to your app via app proxy: `https://your-store.myshopify.com/apps/nutritionniste`
3. Click "Commencer ma consultation"
4. Verify that your name appears in the greeting
5. Check database to confirm `shopifyCustomerId` and `shopifyCustomerName` are saved

### Test without Shopify Customer:

1. Log out of Shopify (or use incognito mode)
2. Navigate to your app
3. Click "Commencer ma consultation"
4. Verify normal anonymous flow works

## Security Considerations

1. **Signature Verification:** The app proxy secret should be set to verify request signatures (optional but recommended for production)
2. **Admin Token Security:** Keep your Shopify Admin Access Token secure and never commit it to version control
3. **Customer Data:** Customer information is stored in the database and used only for personalization

## Troubleshooting

### Customer not detected:

- Check that app proxy is configured correctly in Shopify
- Verify `SHOPIFY_ADMIN_ACCESS_TOKEN` is set correctly
- Check browser console and server logs for errors
- Ensure customer is actually logged into Shopify store

### Profile not saving:

- Check MongoDB connection
- Verify database schema includes new Shopify fields
- Check server logs for database errors

### Signature verification failing:

- Verify `SHOPIFY_APP_PROXY_SECRET` matches the secret in Shopify app proxy settings
- Check that signature verification is working correctly (see `src/lib/shopify-auth.ts`)

## Next Steps

For production deployment:

1. Set all required environment variables in your hosting platform
2. Configure Shopify App Proxy with your production URL
3. Test the integration with real Shopify customers
4. Monitor logs for any authentication issues
