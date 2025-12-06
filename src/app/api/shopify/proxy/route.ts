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
          let body: any = {}
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
     // Simple health check / debug endpoint for the proxy
     try {
          const url = new URL(request.url)
          const shop = url.searchParams.get('shop')

          return NextResponse.json(
               {
                    status: 'ok',
                    message: 'Shopify proxy endpoint is running',
                    shop: shop || null,
               },
               { status: 200 }
          )
     } catch (error) {
          console.error('[Shopify Proxy] GET error:', error)
          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          )
     }
}
