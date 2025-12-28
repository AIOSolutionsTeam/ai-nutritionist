import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, unauthorizedResponse } from '../../../../lib/admin-auth';
import { aiUsageService } from '../../../../lib/ai-usage';
import { dbService } from '../../../../lib/db';

export async function GET(request: NextRequest) {
    // Check authentication
    if (!isAuthenticated(request)) {
        return unauthorizedResponse();
    }

    try {
        await dbService.connect();
        const stats = await aiUsageService.getUsageStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error('[Admin Usage API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch usage stats' },
            { status: 500 }
        );
    }
}
