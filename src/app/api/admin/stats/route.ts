import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '../../../../lib/admin-auth';
import { analyticsEventService } from '../../../../lib/analytics-event';
import { dbService } from '../../../../lib/db';

// GET /api/admin/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
    // Check authentication
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        // Ensure database connection
        await dbService.connect();

        const { searchParams } = new URL(request.url);

        const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
        const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

        const compareStartDate = searchParams.get('compareStartDate') ? new Date(searchParams.get('compareStartDate')!) : undefined;
        const compareEndDate = searchParams.get('compareEndDate') ? new Date(searchParams.get('compareEndDate')!) : undefined;
        const prevStartDate = searchParams.get('prevStartDate') ? new Date(searchParams.get('prevStartDate')!) : undefined;
        const prevEndDate = searchParams.get('prevEndDate') ? new Date(searchParams.get('prevEndDate')!) : undefined;

        const stats = await analyticsEventService.getDashboardStats(
            startDate,
            endDate,
            compareStartDate,
            compareEndDate,
            prevStartDate,
            prevEndDate
        );

        return NextResponse.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);

        // Check for Firebase config error
        if (error instanceof Error && error.name === 'FirebaseConfigError') {
            return NextResponse.json(
                {
                    error: 'Firebase Configuration Error',
                    message: error.message,
                    code: 'FIREBASE_CONFIG_ERROR'
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
