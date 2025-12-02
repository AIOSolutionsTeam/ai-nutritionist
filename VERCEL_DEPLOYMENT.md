# Vercel Deployment Guide

## Environment Variables Setup

To ensure products display correctly in your Vercel deployment, you need to configure environment variables in your Vercel project settings.

### Required Environment Variables

1. **Shopify Configuration** (Optional but recommended)
   - `SHOPIFY_STORE_DOMAIN` - Your Shopify store domain (e.g., `your-store.myshopify.com`)
   - `SHOPIFY_STOREFRONT_ACCESS_TOKEN` - Your Shopify Storefront API access token

2. **AI Provider Configuration** (Required - at least one)
   - `OPENAI_API_KEY` - Your OpenAI API key (if using OpenAI)
   - `GOOGLE_AI_API_KEY` - Your Google AI API key (if using Gemini)

3. **Database Configuration** (Optional)
   - `DATABASE_URL` - Your database connection string (if using a database)

### How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: The variable name (e.g., `SHOPIFY_STORE_DOMAIN`)
   - **Value**: The variable value
   - **Environment**: Select which environments to apply to (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your application for changes to take effect

### Important Notes

- **If Shopify credentials are not set**: The app will automatically use mock product data. Products should still display, but they will be sample products.
- **After adding environment variables**: You must redeploy your application for the changes to take effect.
- **Environment-specific variables**: You can set different values for Production, Preview, and Development environments.

### Troubleshooting Product Display Issues

If products are not showing in your Vercel deployment:

1. **Check Vercel Logs**:
   - Go to your Vercel project → **Deployments** → Click on a deployment → **Functions** tab
   - Look for logs starting with `[Shopify]` or `[API]` to see what's happening

2. **Verify Environment Variables**:
   - Ensure variables are set in Vercel dashboard
   - Check that variable names match exactly (case-sensitive)
   - Verify the values are correct (no extra spaces)

3. **Check Console Logs**:
   - Open browser developer tools (F12)
   - Check the Console tab for any errors
   - Look for network requests to `/api/chat` and inspect the response

4. **Test with Mock Data**:
   - If Shopify credentials are missing, the app should still show mock products
   - If no products show even with mock data, check the API logs for errors

### Common Issues

**Issue**: Products don't show even though environment variables are set
- **Solution**: Redeploy the application after setting environment variables

**Issue**: Products show locally but not on Vercel
- **Solution**: Check that environment variables are set for the Production environment in Vercel

**Issue**: Empty product list returned
- **Solution**: Check Vercel function logs to see if product search is being triggered and what queries are being used

### Testing

After deployment, test the product display by:
1. Sending a message that should trigger product recommendations (e.g., "I need vitamins" or "recommend supplements")
2. Check the browser console for any errors
3. Check Vercel function logs for product search activity

