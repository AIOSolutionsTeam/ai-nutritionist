import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '../../../../../lib/admin-auth';
import { analyticsEventService } from '../../../../../lib/analytics-event';
import { dbService } from '../../../../../lib/db';

// GET /api/admin/stats/comparison - Get dashboard comparison statistics only
export async function GET(request: NextRequest) {
    // Check authentication
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        // Ensure database connection
        await dbService.connect();

        const { searchParams } = new URL(request.url);

        const compareStartDate = searchParams.get('compareStartDate') ? new Date(searchParams.get('compareStartDate')!) : undefined;
        const compareEndDate = searchParams.get('compareEndDate') ? new Date(searchParams.get('compareEndDate')!) : undefined;
        const prevStartDate = searchParams.get('prevStartDate') ? new Date(searchParams.get('prevStartDate')!) : undefined;
        const prevEndDate = searchParams.get('prevEndDate') ? new Date(searchParams.get('prevEndDate')!) : undefined;

        const comparisonStats = await analyticsEventService.getPeriodComparison(
            compareStartDate,
            compareEndDate,
            prevStartDate,
            prevEndDate
        );

        return NextResponse.json({
            success: true,
            data: comparisonStats
        });
    } catch (error) {
        console.error('Error fetching comparison stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch comparison statistics' },
            { status: 500 }
        );
    }
}
