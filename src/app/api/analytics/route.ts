import { NextRequest, NextResponse } from 'next/server';
import { analyticsEventService } from '../../../lib/analytics-event';
import { dbService } from '../../../lib/db';

// POST /api/analytics - Track analytics events from client-side
// This endpoint receives events from the widget/frontend and persists them to MongoDB
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { event, properties, userId, sessionId } = body;

        if (!event) {
            return NextResponse.json(
                { error: 'event is required' },
                { status: 400 }
            );
        }

        if (!sessionId) {
            return NextResponse.json(
                { error: 'sessionId is required' },
                { status: 400 }
            );
        }

        // Ensure database connection
        await dbService.connect();

        // Create the analytics event
        const newEvent = await analyticsEventService.createEvent({
            event,
            properties: properties || {},
            userId: userId || undefined,
            sessionId
        });

        console.log('[Analytics API] Event tracked:', event, { userId, sessionId });

        return NextResponse.json({
            success: true,
            eventId: newEvent.id
        }, { status: 201 });
    } catch (error) {
        console.error('[Analytics API] Error tracking event:', error);
        return NextResponse.json(
            { error: 'Failed to track event' },
            { status: 500 }
        );
    }
}
