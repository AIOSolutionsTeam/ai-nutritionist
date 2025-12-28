import { NextRequest, NextResponse } from 'next/server';

// Admin authentication configuration
// Set ADMIN_PASSWORD in your .env file
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Simple session store (in production, use Redis or database)
const sessionStore = new Map<string, { expiresAt: number }>();

// Generate a random session token
function generateSessionToken(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Validate admin password and create session
export function authenticateAdmin(password: string): string | null {
    if (password === ADMIN_PASSWORD) {
        const token = generateSessionToken();
        sessionStore.set(token, { expiresAt: Date.now() + SESSION_DURATION_MS });
        return token;
    }
    return null;
}

// Validate session token
export function validateSession(token: string): boolean {
    const session = sessionStore.get(token);
    if (!session) return false;

    if (Date.now() > session.expiresAt) {
        sessionStore.delete(token);
        return false;
    }

    return true;
}

// Clear session
export function clearSession(token: string): void {
    sessionStore.delete(token);
}

// Middleware to check admin authentication
export function isAuthenticated(request: NextRequest): boolean {
    // Check for session cookie
    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (sessionToken && validateSession(sessionToken)) {
        return true;
    }

    // Check for Authorization header (for API calls)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return validateSession(token);
    }

    return false;
}

// Create unauthorized response
export function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin authentication required' },
        { status: 401 }
    );
}

// Create a response with session cookie
export function createAuthenticatedResponse(token: string, data: Record<string, unknown>): NextResponse {
    const response = NextResponse.json(data);
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_MS / 1000, // in seconds
        path: '/'
    });
    return response;
}

// Create logout response (clears cookie)
export function createLogoutResponse(): NextResponse {
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.set(ADMIN_SESSION_COOKIE, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
    });
    return response;
}

// Clean up expired sessions periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [token, session] of sessionStore.entries()) {
            if (now > session.expiresAt) {
                sessionStore.delete(token);
            }
        }
    }, 60 * 60 * 1000); // Clean up every hour
}
