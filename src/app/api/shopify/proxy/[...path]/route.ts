import { NextRequest, NextResponse } from 'next/server'

// =================================================================
// CATCH-ALL ROUTE FOR SHOPIFY APP PROXY
// =================================================================
// This handles requests like /api/shopify/proxy/[anything]
// Shopify forwards /apps/assistante/child-path to /api/shopify/proxy/child-path
// We redirect these to the base proxy handler
// =================================================================

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params
    const childPath = path.join('/')

    console.log('[Shopify Proxy Catch-All] Child path:', childPath)
    console.log('[Shopify Proxy Catch-All] Full URL:', request.url)

    // For now, we handle all child paths the same as the base path
    // The chat widget doesn't need different routes - it's all rendered in an iframe

    const url = new URL(request.url)

    // Return simple HTML that shows the proxy is working
    // This confirms Shopify is routing correctly
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assistante Virtuelle</title>
</head>
<body style="margin:0;padding:0;">
  <h1>App Proxy Works!</h1>
  <p>Child path: /${childPath}</p>
  <p>Shop: ${url.searchParams.get('shop') || 'N/A'}</p>
  <p>Timestamp: ${url.searchParams.get('timestamp') || 'N/A'}</p>
  <p><a href="/apps/assistante">Go to main chat</a></p>
</body>
</html>`

    return new NextResponse(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
    })
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    // Forward POST requests to child paths (if any)
    const { path } = await params
    console.log('[Shopify Proxy Catch-All] POST to child path:', path.join('/'))

    return NextResponse.json({
        error: 'Child path POST not implemented',
        path: path.join('/'),
    }, { status: 404 })
}
