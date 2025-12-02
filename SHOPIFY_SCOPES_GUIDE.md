# Shopify API Scopes Guide

This document outlines the required Shopify API scopes and access tokens for your AI Nutritionist project.

## Current Implementation

Your project currently uses:
1. **Shopify Storefront API** - For fetching products (no OAuth scopes needed)
2. **Shopify Cart API** - For adding items to cart (public API, no authentication needed)

## Required Scopes by Feature

### 1. Getting Products/Combos List ✅ (Already Implemented)

**API Used:** Shopify Storefront API  
**Authentication:** Storefront Access Token (not OAuth)  
**Scopes Required:** None (Storefront API uses access tokens, not OAuth scopes)

**Current Setup:**
- Environment variable: `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- No OAuth scopes needed
- Works with public Storefront API token

**How to Get:**
1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → Create a custom app
3. Configure Admin API scopes (if needed for other features)
4. Go to "API credentials" tab
5. Under "Storefront API", click "Reveal token once" or "Install app"
6. Copy the Storefront access token

### 2. Adding Items to Cart ✅ (Already Implemented)

**API Used:** Shopify Cart API (`/cart/add.js`)  
**Authentication:** None (public API)  
**Scopes Required:** None

**Current Implementation:**
- Uses `/cart/add.js` endpoint (public, no auth)
- Works when app is embedded in Shopify or via App Proxy
- No OAuth scopes needed

### 3. Getting User ID ❌ (Not Yet Implemented)

**Options:**

#### Option A: Customer Account API (Recommended for Customer Data)

**API Used:** Customer Account API  
**Authentication:** OAuth 2.0  
**Scopes Required:**
```
customer_account_api:read
customer_account_api:write
```

**Use Case:** Get customer information when they're logged into Shopify

**How to Implement:**
- Requires OAuth 2.0 flow
- Customer must be logged into Shopify store
- Returns customer ID, email, name, etc.

#### Option B: Admin API (For Store Owner/Staff)

**API Used:** Admin API  
**Authentication:** OAuth 2.0  
**Scopes Required:**
```
read_customers
read_orders
```

**Use Case:** Access customer data from admin perspective

**How to Implement:**
- Requires creating a Shopify App
- OAuth 2.0 installation flow
- Returns customer data from admin perspective

#### Option C: Customer Session Token (For Checkout/Cart)

**API Used:** Customer Account API (via session token)  
**Authentication:** Session token from checkout/cart  
**Scopes Required:** None (uses session token)

**Use Case:** Get customer ID during checkout or cart session

## Recommended Setup for Your Project

Based on your requirements, here's what you need:

### Minimum Setup (Current - Products & Cart Only)
```
✅ Storefront Access Token (already have)
✅ No OAuth scopes needed
```

### Full Setup (Products, Cart, + User ID)

If you need to get user/customer ID, you have two paths:

#### Path 1: Customer Account API (Best for Customer-Facing Features)

**Required Scopes:**
```
customer_account_api:read
```

**Setup Steps:**
1. Create a Shopify App in Partner Dashboard
2. Configure OAuth redirect URLs
3. Request `customer_account_api:read` scope
4. Implement OAuth flow to get customer access token
5. Use Customer Account API to get customer ID

**API Endpoint Example:**
```graphql
query {
  customer {
    id
    email
    firstName
    lastName
  }
}
```

#### Path 2: Admin API (For Store Management)

**Required Scopes:**
```
read_customers
read_orders
```

**Setup Steps:**
1. Create a Shopify App in Partner Dashboard
2. Configure OAuth redirect URLs
3. Request `read_customers` scope
4. Implement OAuth installation flow
5. Use Admin API to access customer data

**API Endpoint Example:**
```
GET /admin/api/2024-01/customers/{customer_id}.json
```

## Implementation Guide

### For Storefront API (Products) - Already Working ✅

No changes needed. Your current implementation in `src/lib/shopify.ts` is correct.

### For Cart API (Add to Cart) - Already Working ✅

No changes needed. Your current implementation in `src/utils/shopifyCart.ts` is correct.

### For User ID - New Implementation Needed

If you need user ID, choose one of these approaches:

#### Approach 1: Customer Account API (Recommended)

1. **Create Shopify App:**
   - Go to https://partners.shopify.com
   - Create a new app
   - Set OAuth redirect URL: `https://your-app.com/api/auth/shopify/callback`

2. **Request Scopes:**
   - In app settings, request: `customer_account_api:read`

3. **Implement OAuth Flow:**
   ```typescript
   // Example OAuth flow
   const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=customer_account_api:read&redirect_uri=${redirectUri}`;
   ```

4. **Get Customer ID:**
   ```typescript
   const query = `
     query {
       customer {
         id
         email
       }
     }
   `;
   ```

#### Approach 2: Use Session Token (Simpler, Limited)

If you only need user ID during checkout/cart:
- Use `customer_session_token` from cart/checkout
- No OAuth required
- Limited to checkout/cart context

## Summary

| Feature | API | Scopes Needed | Status |
|---------|-----|---------------|--------|
| Get Products | Storefront API | None (uses access token) | ✅ Implemented |
| Add to Cart | Cart API | None (public API) | ✅ Implemented |
| Get User ID | Customer Account API | `customer_account_api:read` | ❌ Not Implemented |
| Get User ID (Admin) | Admin API | `read_customers` | ❌ Not Implemented |

## Next Steps

1. **If you only need products and cart:** No changes needed! ✅
2. **If you need user ID:**
   - Decide between Customer Account API or Admin API
   - Create a Shopify App in Partner Dashboard
   - Request appropriate scopes
   - Implement OAuth flow

## Resources

- [Shopify Storefront API Docs](https://shopify.dev/docs/api/storefront)
- [Shopify Customer Account API](https://shopify.dev/docs/api/customer)
- [Shopify Admin API](https://shopify.dev/docs/api/admin)
- [Shopify OAuth Scopes](https://shopify.dev/docs/apps/auth/oauth/scopes)

