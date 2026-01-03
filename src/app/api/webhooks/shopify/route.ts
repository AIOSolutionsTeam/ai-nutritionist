import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Shopify webhook handler for order creation
// This endpoint receives notifications when orders are completed on Shopify

interface ShopifyLineItem {
    variant_id: number;
    product_id: number;
    title: string;
    quantity: number;
    price: string;
    properties?: Array<{ name: string; value: string }>;
}

interface ShopifyOrder {
    id: number;
    order_number: number;
    email: string;
    total_price: string;
    currency: string;
    created_at: string;
    line_items: ShopifyLineItem[];
    note?: string;
    note_attributes?: Array<{ name: string; value: string }>;
    cart_token?: string;
}

/**
 * Verify Shopify webhook signature
 */
function verifyShopifyWebhook(body: string, signature: string | null): boolean {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!secret) {
        console.warn('[Shopify Webhook] SHOPIFY_WEBHOOK_SECRET not configured');
        // In development, allow webhooks without signature verification
        if (process.env.NODE_ENV === 'development') {
            return true;
        }
        return false;
    }

    if (!signature) {
        console.warn('[Shopify Webhook] No signature provided');
        return false;
    }

    const hmac = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

/**
 * Extract sessionId from order data
 * Shopify stores custom attributes in:
 * 1. Line item properties (per-item)
 * 2. Note attributes (cart-level)
 * 3. Cart URL parameters (passed via note)
 */
function extractSessionId(order: ShopifyOrder): string | null {
    // Check note_attributes first (cart-level attribute)
    if (order.note_attributes) {
        const sessionAttr = order.note_attributes.find(
            attr => attr.name === 'sessionId' || attr.name === '_chatbot_session'
        );
        if (sessionAttr?.value) {
            return sessionAttr.value;
        }
    }

    // Check line item properties
    for (const item of order.line_items) {
        if (item.properties) {
            const sessionProp = item.properties.find(
                prop => prop.name === 'sessionId' || prop.name === '_chatbot_session'
            );
            if (sessionProp?.value) {
                return sessionProp.value;
            }
        }
    }

    // Check order note for sessionId (fallback)
    if (order.note) {
        const match = order.note.match(/sessionId[=:]\s*([^\s,]+)/i);
        if (match) {
            return match[1];
        }
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-shopify-hmac-sha256');
        const topic = request.headers.get('x-shopify-topic');

        console.log('[Shopify Webhook] Received:', topic);

        // Verify webhook signature
        if (!verifyShopifyWebhook(body, signature)) {
            console.error('[Shopify Webhook] Invalid signature');
            return NextResponse.json(
                { error: 'Invalid webhook signature' },
                { status: 401 }
            );
        }

        // Parse order data
        const order: ShopifyOrder = JSON.parse(body);

        console.log('[Shopify Webhook] Order received:', {
            orderId: order.id,
            orderNumber: order.order_number,
            totalPrice: order.total_price,
            itemCount: order.line_items.length
        });

        // Extract sessionId from order
        const sessionId = extractSessionId(order);

        if (!sessionId) {
            console.log('[Shopify Webhook] No chatbot sessionId found in order, skipping purchase verification');
            // Still return 200 to acknowledge the webhook
            return NextResponse.json({
                success: true,
                message: 'Webhook received, no chatbot session to track'
            });
        }

        console.log('[Shopify Webhook] Found chatbot sessionId:', sessionId);

        // Import analytics service and record purchase_verified events
        const { analyticsEventService } = await import('@/lib/analytics-event');

        // Record a purchase_verified event for each line item
        for (const item of order.line_items) {
            const price = parseFloat(item.price);
            const totalValue = price * item.quantity;

            await analyticsEventService.createEvent({
                event: 'purchase_verified',
                sessionId,
                properties: {
                    order_id: order.id,
                    order_number: order.order_number,
                    product_name: item.title,
                    product_id: item.product_id.toString(),
                    variant_id: item.variant_id.toString(),
                    quantity: item.quantity,
                    unit_price: price,
                    total_value: totalValue,
                    currency: order.currency,
                    email: order.email,
                    source: 'shopify_webhook'
                }
            });

            console.log('[Shopify Webhook] Recorded purchase_verified event:', {
                sessionId,
                product: item.title,
                value: totalValue
            });
        }

        // Record an overall order event with total revenue
        const totalOrderValue = parseFloat(order.total_price);
        await analyticsEventService.createEvent({
            event: 'order_completed',
            sessionId,
            properties: {
                order_id: order.id,
                order_number: order.order_number,
                total_value: totalOrderValue,
                currency: order.currency,
                item_count: order.line_items.length,
                email: order.email,
                source: 'shopify_webhook'
            }
        });

        console.log('[Shopify Webhook] Recorded order_completed event:', {
            sessionId,
            orderId: order.id,
            totalValue: totalOrderValue
        });

        return NextResponse.json({
            success: true,
            message: 'Purchase verified and tracked',
            sessionId,
            orderId: order.id,
            itemsTracked: order.line_items.length
        });

    } catch (error) {
        console.error('[Shopify Webhook] Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Shopify sends a GET request to verify the endpoint exists
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'Shopify webhook handler',
        supported_topics: ['orders/create']
    });
}
