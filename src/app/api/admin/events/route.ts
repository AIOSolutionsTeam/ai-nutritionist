import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '../../../../lib/admin-auth';
import { analyticsEventService } from '../../../../lib/analytics-event';
import { dbService } from '../../../../lib/db';

// GET /api/admin/events - Get analytics events with filters
export async function GET(request: NextRequest) {
    // Check authentication
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        // Ensure database connection
        await dbService.connect();

        const { searchParams } = new URL(request.url);

        const filters = {
            eventType: searchParams.get('eventType') || undefined,
            userId: searchParams.get('userId') || undefined,
            sessionId: searchParams.get('sessionId') || undefined,
            startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
            endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
            skip: searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0
        };

        const events = await analyticsEventService.getEvents(filters);

        return NextResponse.json({
            success: true,
            data: events,
            count: events.length
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

// POST /api/admin/events - Create a test event (for testing purposes)
export async function POST(request: NextRequest) {
    // Check authentication
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        // Ensure database connection
        await dbService.connect();

        const body = await request.json();
        const { event, properties, userId, sessionId } = body;

        if (!event || !sessionId) {
            return NextResponse.json(
                { error: 'event and sessionId are required' },
                { status: 400 }
            );
        }

        const newEvent = await analyticsEventService.createEvent({
            event,
            properties: properties || {},
            userId,
            sessionId
        });

        return NextResponse.json({
            success: true,
            data: newEvent
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating event:', error);
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        );
    }
}
