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
     // Return Liquid/HTML that embeds the chat widget in an iframe
     // This is served when users visit /apps/assistante-virtuelle on the Shopify store
     try {
          const url = new URL(request.url)

          // Verify signature for security (optional but recommended)
          const isValid = verifyShopifyProxySignature(url)
          if (!isValid) {
               console.warn('[Shopify Proxy] Invalid signature on GET request, allowing for development')
               // In production you may want to return 401 here
               // For now, we allow it to make testing easier
          }

          // Extract Shopify context
          const shop = url.searchParams.get('shop') || ''
          const customerId = url.searchParams.get('logged_in_customer_id') || ''
          const timestamp = url.searchParams.get('timestamp') || ''

          // Build the embed URL - use the Vercel deployment URL
          const appOrigin = process.env.NEXT_PUBLIC_APP_URL ||
               process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
               url.origin

          const embedUrl = new URL('/embed', appOrigin)
          embedUrl.searchParams.set('shop', shop)
          if (customerId) {
               embedUrl.searchParams.set('logged_in_customer_id', customerId)
          }
          embedUrl.searchParams.set('timestamp', timestamp)

          // Return Liquid template that renders the iframe
          // Using Shopify Liquid syntax for dynamic content
          const liquidTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Assistante Virtuelle | VIGAÏA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
      background-color: #FEFDFB;
    }
    
    .chat-container {
      width: 100%;
      height: 100vh;
      height: 100dvh; /* Dynamic viewport height for mobile */
      position: relative;
    }
    
    .chat-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #FEFDFB;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: opacity 0.3s ease;
    }
    
    .loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #E8E4DC;
      border-top-color: #7C9A5E;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="loading-overlay" id="loading">
      <div class="loading-spinner"></div>
    </div>
    <iframe 
      id="chat-iframe"
      class="chat-iframe" 
      src="${embedUrl.toString()}"
      allow="microphone"
      title="Assistante Virtuelle VIGAÏA"
    ></iframe>
  </div>
  
  <script>
    (function() {
      var iframe = document.getElementById('chat-iframe');
      var loading = document.getElementById('loading');
      
      // Hide loading when iframe is ready
      iframe.addEventListener('load', function() {
        setTimeout(function() {
          loading.classList.add('hidden');
        }, 300);
      });
      
      // Listen for messages from the iframe
      window.addEventListener('message', function(event) {
        // Verify origin for security
        var allowedOrigin = '${appOrigin}';
        if (event.origin !== allowedOrigin) return;
        
        var data = event.data;
        if (!data || !data.type) return;
        
        switch (data.type) {
          case 'CHAT_READY':
            loading.classList.add('hidden');
            break;
          case 'CHAT_CLOSE':
            // Navigate back or close - customize as needed
            window.history.back();
            break;
          case 'ADD_TO_CART':
            // Handle cart additions if needed
            // This allows the iframe to trigger cart updates
            if (window.Shopify && data.variantId) {
              fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: data.variantId,
                  quantity: data.quantity || 1,
                  properties: data.properties || {}
                })
              })
              .then(function(response) { return response.json(); })
              .then(function(item) {
                iframe.contentWindow.postMessage({ 
                  type: 'CART_UPDATED', 
                  success: true, 
                  item: item 
                }, allowedOrigin);
                // Optionally refresh cart drawer
                if (typeof refreshCart === 'function') refreshCart();
              })
              .catch(function(error) {
                iframe.contentWindow.postMessage({ 
                  type: 'CART_UPDATED', 
                  success: false, 
                  error: error.message 
                }, allowedOrigin);
              });
            }
            break;
        }
      });
    })();
  </script>
</body>
</html>
`.trim()

          // Return as HTML (Shopify App Proxy expects text/html for rendering)
          return new NextResponse(liquidTemplate, {
               status: 200,
               headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
               },
          })
     } catch (error) {
          console.error('[Shopify Proxy] GET error:', error)
          return new NextResponse(
               '<html><body><h1>Error loading chat</h1><p>Please try again later.</p></body></html>',
               {
                    status: 500,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
               }
          )
     }
}
