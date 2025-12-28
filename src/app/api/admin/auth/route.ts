import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, createAuthenticatedResponse, clearSession, createLogoutResponse, isAuthenticated } from '../../../../lib/admin-auth';

// POST /api/admin/auth - Login
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json(
                { error: 'Password required' },
                { status: 400 }
            );
        }

        const token = authenticateAdmin(password);
        if (!token) {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }

        return createAuthenticatedResponse(token, {
            success: true,
            message: 'Authenticated successfully'
        });
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/auth - Logout
export async function DELETE(request: NextRequest) {
    try {
        const sessionToken = request.cookies.get('admin_session')?.value;
        if (sessionToken) {
            clearSession(sessionToken);
        }
        return createLogoutResponse();
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        );
    }
}

// GET /api/admin/auth - Check auth status
export async function GET(request: NextRequest) {
    const authenticated = isAuthenticated(request);
    return NextResponse.json({ authenticated });
}
