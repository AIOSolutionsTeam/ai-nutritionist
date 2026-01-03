import { NextRequest, NextResponse } from 'next/server';

/**
 * TEST ENDPOINT - Simulates a Shopify order webhook
 * Use this to test the purchase tracking without a real purchase
 * 
 * Usage: POST to /api/webhooks/shopify/test with body:
 * {
 *   "sessionId": "session_xxx_xxx",  // The chatbot session ID to link the purchase
 *   "products": [
 *     { "title": "Product Name", "price": 29.99, "quantity": 1, "variantId": "12345" }
 *   ]
 * }
 */

interface TestProduct {
    title: string;
    price: number;
    quantity?: number;
    variantId?: string;
}

interface TestOrderPayload {
    sessionId: string;
    products: TestProduct[];
    email?: string;
}

export async function POST(request: NextRequest) {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'Test endpoint only available in development mode' },
            { status: 403 }
        );
    }

    try {
        const body: TestOrderPayload = await request.json();

        if (!body.sessionId) {
            return NextResponse.json(
                { error: 'sessionId is required' },
                { status: 400 }
            );
        }

        if (!body.products || body.products.length === 0) {
            return NextResponse.json(
                { error: 'products array is required' },
                { status: 400 }
            );
        }

        console.log('[Shopify Test Webhook] Simulating order with sessionId:', body.sessionId);

        // Import analytics service
        const { analyticsEventService } = await import('@/lib/analytics-event');

        const orderId = Date.now();
        const orderNumber = Math.floor(Math.random() * 10000) + 1000;
        let totalOrderValue = 0;

        // Record purchase_verified event for each product
        for (const product of body.products) {
            const quantity = product.quantity || 1;
            const totalValue = product.price * quantity;
            totalOrderValue += totalValue;

            await analyticsEventService.createEvent({
                event: 'purchase_verified',
                sessionId: body.sessionId,
                properties: {
                    order_id: orderId,
                    order_number: orderNumber,
                    product_name: product.title,
                    product_id: product.variantId || 'test-product',
                    variant_id: product.variantId || 'test-variant',
                    quantity: quantity,
                    unit_price: product.price,
                    total_value: totalValue,
                    currency: 'EUR',
                    email: body.email || 'test@example.com',
                    source: 'test_webhook'
                }
            });

            console.log('[Shopify Test Webhook] Created purchase_verified event:', {
                product: product.title,
                value: totalValue
            });
        }

        // Record order_completed event
        await analyticsEventService.createEvent({
            event: 'order_completed',
            sessionId: body.sessionId,
            properties: {
                order_id: orderId,
                order_number: orderNumber,
                total_value: totalOrderValue,
                currency: 'EUR',
                item_count: body.products.length,
                email: body.email || 'test@example.com',
                source: 'test_webhook'
            }
        });

        console.log('[Shopify Test Webhook] Created order_completed event:', {
            orderId,
            totalValue: totalOrderValue
        });

        return NextResponse.json({
            success: true,
            message: 'Test purchase events created successfully',
            orderId,
            orderNumber,
            sessionId: body.sessionId,
            totalValue: totalOrderValue,
            productsTracked: body.products.length
        });

    } catch (error) {
        console.error('[Shopify Test Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Failed to simulate purchase' },
            { status: 500 }
        );
    }
}

// Info endpoint
export async function GET() {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
    }

    return NextResponse.json({
        endpoint: 'Shopify Webhook Test Simulator',
        usage: 'POST with { sessionId, products: [{ title, price, quantity?, variantId? }] }',
        example: {
            sessionId: 'session_1234567890_abc123xyz',
            products: [
                { title: 'Vitamine D3', price: 19.99, quantity: 1 },
                { title: 'Omega 3', price: 29.99, quantity: 2 }
            ]
        }
    });
}
