import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// Admin authentication configuration
// Set ADMIN_PASSWORD in your .env file
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper to sign data
function sign(data: string): string {
    return createHmac('sha256', ADMIN_PASSWORD).update(data).digest('hex');
}

// Generate a stateless session token
function generateSessionToken(): string {
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    const payload = expiresAt.toString();
    const signature = sign(payload);
    return `${payload}.${signature}`;
}

// Validate admin password and create session
export function authenticateAdmin(password: string): string | null {
    if (password === ADMIN_PASSWORD) {
        return generateSessionToken();
    }
    return null;
}

// Clear session
export function clearSession(token: string): void {
    // Stateless session: we can't invalidate tokens server-side without a database.
    // Client-side cookie clearing is sufficient for this simple implementation.
}
// Validate session token
export function validateSession(token: string): boolean {
    try {
        const [payload, tokenSignature] = token.split('.');
        if (!payload || !tokenSignature) return false;

        // Check if expired
        const expiresAt = parseInt(payload, 10);
        if (isNaN(expiresAt) || Date.now() > expiresAt) {
            return false;
        }

        // Verify signature
        const expectedSignature = sign(payload);

        // Use timingSafeEqual to prevent timing attacks
        const tokenSigBuffer = Buffer.from(tokenSignature);
        const expectedSigBuffer = Buffer.from(expectedSignature);

        if (tokenSigBuffer.length !== expectedSigBuffer.length) {
            return false;
        }

        return timingSafeEqual(tokenSigBuffer, expectedSigBuffer);
    } catch {
        return false;
    }
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

