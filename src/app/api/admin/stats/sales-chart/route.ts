import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '../../../../../lib/admin-auth';
import { analyticsEventService } from '../../../../../lib/analytics-event';
import { dbService } from '../../../../../lib/db';

// GET /api/admin/stats/sales-chart - Get sales chart data
export async function GET(request: NextRequest) {
    // Check authentication
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        // Ensure database connection
        await dbService.connect();

        const { searchParams } = new URL(request.url);
        const granularity = (searchParams.get('granularity') as 'week' | 'month' | 'year') || 'week';

        if (!['week', 'month', 'year'].includes(granularity)) {
            return NextResponse.json(
                { error: 'Invalid granularity. Must be week, month, or year.' },
                { status: 400 }
            );
        }

        const chartData = await analyticsEventService.getSalesChartData(granularity);

        return NextResponse.json({
            success: true,
            data: chartData
        });
    } catch (error) {
        console.error('Error fetching sales chart data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sales chart data' },
            { status: 500 }
        );
    }
}
