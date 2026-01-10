import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Ensure we run on the Node.js runtime so we can use the crypto module
export const runtime = 'nodejs'

const SHOPIFY_APP_SECRET =
     process.env.SHOPIFY_API_SECRET ||
     process.env.SHOPIFY_API_SECRET_KEY ||
     ''

function timingSafeEqual(a: string, b: string): boolean {
     const aBuf = Buffer.from(a, 'utf8')
     const bBuf = Buffer.from(b, 'utf8')

     if (aBuf.length !== bBuf.length) {
          return false
     }

     return crypto.timingSafeEqual(aBuf, bBuf)
}

function verifyShopifyProxySignature(url: URL): boolean {
     if (!SHOPIFY_APP_SECRET) {
          console.warn('[Shopify Proxy] Missing SHOPIFY_API_SECRET / SHOPIFY_API_SECRET_KEY')
          // If there is no secret configured, fail closed
          return false
     }

     const signature = url.searchParams.get('signature')
     if (!signature) {
          return false
     }

     const params: string[] = []

     url.searchParams.forEach((value, key) => {
          if (key === 'signature') return
          // Per Shopify docs: sort by key, then concatenate as key=value with no separators
          params.push(`${key}=${value}`)
     })

     params.sort((a, b) => {
          const aKey = a.split('=')[0]
          const bKey = b.split('=')[0]
          return aKey.localeCompare(bKey)
     })

     const message = params.join('')

     const digest = crypto
          .createHmac('sha256', SHOPIFY_APP_SECRET)
          .update(message)
          .digest('hex')

     return timingSafeEqual(signature, digest)
}

export async function POST(request: NextRequest) {
     try {
          const url = new URL(request.url)

          // 1. Verify Shopify app proxy signature
          const isValid = verifyShopifyProxySignature(url)

          if (!isValid) {
               return NextResponse.json(
                    { error: 'Invalid Shopify app proxy signature' },
                    { status: 401 }
               )
          }

          // 2. Extract Shopify context from query params
          const shop = url.searchParams.get('shop') || undefined
          const loggedInCustomerId = url.searchParams.get('logged_in_customer_id') || undefined

          // Prefer an explicit userId in the body, otherwise derive one from Shopify context
          let body: {
               message?: string;
               conversationHistory?: unknown;
               provider?: string;
               userId?: string;
          } = {}
          try {
               body = await request.json()
          } catch {
               body = {}
          }

          const message: string | undefined = body.message
          const conversationHistory = body.conversationHistory
          const provider = body.provider

          if (!message) {
               return NextResponse.json(
                    { error: 'Message is required' },
                    { status: 400 }
               )
          }

          const derivedUserId =
               body.userId ||
               (loggedInCustomerId ? `shopify_customer_${loggedInCustomerId}` : undefined) ||
               (shop ? `shopify_shop_${shop}` : 'anonymous')

          // 3. Forward the request to the existing /api/chat endpoint
          const origin = url.origin

          const chatResponse = await fetch(`${origin}/api/chat`, {
               method: 'POST',
               headers: {
                    'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                    message,
                    userId: derivedUserId,
                    conversationHistory,
                    provider,
               }),
               cache: 'no-store',
          })

          const data = await chatResponse.json().catch(() => null)

          if (!chatResponse.ok) {
               return NextResponse.json(
                    { error: 'Chat service error', details: data },
                    { status: chatResponse.status }
               )
          }

          // Optionally enrich the response with Shopify context
          return NextResponse.json({
               ...data,
               shop,
               loggedInCustomerId,
          })
     } catch (error) {
          console.error('[Shopify Proxy] Internal error:', error)
          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          )
     }
}

export async function GET(request: NextRequest) {
     // Serve Liquid template for Shopify App Proxy
     // This returns HTML/Liquid that Shopify renders within the store theme
     try {
          const url = new URL(request.url)
          const shop = url.searchParams.get('shop') || ''
          const loggedInCustomerId = url.searchParams.get('logged_in_customer_id') || ''
          const signature = url.searchParams.get('signature') || ''

          // Verify the signature for security
          const isValid = verifyShopifyProxySignature(url)

          if (!isValid) {
               console.warn('[Shopify Proxy] Invalid signature on GET request')
               // Return a user-friendly error page
               return new NextResponse(
                    `<div style="padding: 40px; text-align: center; font-family: system-ui, sans-serif;">
                         <h2>Accès non autorisé</h2>
                         <p>Cette page doit être accédée via la boutique Shopify.</p>
                    </div>`,
                    {
                         status: 401,
                         headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    }
               )
          }

          // Build the embed URL with Shopify context
          // Use the Vercel deployment URL or configured app URL
          const appUrl = process.env.NEXT_PUBLIC_APP_URL
               || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
               || 'https://ai-nutritionist-v1.vercel.app'

          const embedUrl = new URL('/embed', appUrl)
          embedUrl.searchParams.set('shop', shop)
          if (loggedInCustomerId) {
               embedUrl.searchParams.set('logged_in_customer_id', loggedInCustomerId)
          }

          // Return Liquid template that Shopify will render
          // The iframe loads the embed page from our Vercel app
          const liquidTemplate = `
<!DOCTYPE html>
<html>
<head>
     <meta charset="utf-8">
     <meta name="viewport" content="width=device-width, initial-scale=1">
     <title>Assistante Virtuelle | {{ shop.name }}</title>
     <style>
          .chat-embed-container {
               width: 100%;
               max-width: 1200px;
               margin: 0 auto;
               padding: 20px;
          }
          .chat-embed-header {
               text-align: center;
               margin-bottom: 20px;
          }
          .chat-embed-header h1 {
               font-family: inherit;
               font-size: 1.8rem;
               color: #333;
               margin: 0 0 8px 0;
          }
          .chat-embed-header p {
               color: #666;
               margin: 0;
          }
          .chat-embed-iframe {
               width: 100%;
               height: 700px;
               border: none;
               border-radius: 16px;
               box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
               background: #FEFDFB;
          }
          @media (max-width: 768px) {
               .chat-embed-container {
                    padding: 10px;
               }
               .chat-embed-iframe {
                    height: calc(100vh - 200px);
                    min-height: 500px;
                    border-radius: 12px;
               }
               .chat-embed-header h1 {
                    font-size: 1.4rem;
               }
          }
     </style>
</head>
<body>
     <div class="chat-embed-container">
          <div class="chat-embed-header">
               <h1>🌿 Assistante Nutritionnelle Virtuelle</h1>
               <p>Posez vos questions sur la nutrition et découvrez nos produits personnalisés</p>
          </div>
          <iframe 
               src="${embedUrl.toString()}" 
               class="chat-embed-iframe"
               allow="microphone"
               title="Assistante Nutritionnelle"
               loading="lazy"
          ></iframe>
     </div>
     <script>
          // Listen for messages from the iframe
          window.addEventListener('message', function(event) {
               if (event.data && event.data.type === 'CHAT_CLOSE') {
                    // Handle close action - could navigate back or hide the chat
                    console.log('[Shopify Embed] Chat close requested');
               }
               if (event.data && event.data.type === 'CART_UPDATE') {
                    // Refresh the cart if the iframe adds products
                    if (typeof Shopify !== 'undefined' && Shopify.onCartUpdate) {
                         fetch('/cart.js')
                              .then(r => r.json())
                              .then(cart => Shopify.onCartUpdate(cart));
                    }
               }
          });
     </script>
</body>
</html>
`

          return new NextResponse(liquidTemplate, {
               status: 200,
               headers: {
                    'Content-Type': 'application/liquid; charset=utf-8',
               }
          })
     } catch (error) {
          console.error('[Shopify Proxy] GET error:', error)
          return new NextResponse(
               '<div style="padding: 40px; text-align: center;">Une erreur est survenue. Veuillez réessayer.</div>',
               {
                    status: 500,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
               }
          )
     }
}
