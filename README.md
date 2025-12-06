# AI Nutritionist

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Shopify Storefront API Configuration
# Get these from your Shopify admin panel under Apps > App and sales channel settings > Develop apps
SHOPIFY_STORE_DOMAIN=your-store-name.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your-storefront-access-token

# Shopify Admin API (for customer authentication)
# Get this from your Shopify admin panel under Apps > Your App > API credentials
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_your_admin_access_token

# Shopify App Proxy Secret (optional, for signature verification)
# Set this in your Shopify app proxy settings and match it here
SHOPIFY_APP_PROXY_SECRET=your-app-proxy-secret

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your-openai-api-key

# Google AI Configuration (if using Google AI)
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Database Configuration (if using a database)
DATABASE_URL=your-database-connection-string

# Email Configuration (if using email features)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

**Note:** If Shopify credentials are not provided, the app will use mock data for testing purposes.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
