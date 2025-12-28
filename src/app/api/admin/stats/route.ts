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

        const stats = await analyticsEventService.getDashboardStats(startDate, endDate);

        return NextResponse.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
