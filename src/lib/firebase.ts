import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK configuration
// Set these environment variables in your .env file:
// FIREBASE_PROJECT_ID=your-project-id
// FIREBASE_CLIENT_EMAIL=your-service-account-email
// FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//
// For AWS Amplify: Use base64-encoded private key to avoid newline issues:
// FIREBASE_PRIVATE_KEY_BASE64=<base64 encoded private key>

let app: App | undefined;
let db: Firestore | undefined;

/**
 * Decode the Firebase private key
 * Supports both plain-text (with escaped \n) and base64-encoded keys
 */
function decodePrivateKey(): string | undefined {
    // Option 1: Base64 encoded (recommended for AWS Amplify)
    const base64Key = process.env.FIREBASE_PRIVATE_KEY_BASE64;
    if (base64Key) {
        try {
            const decoded = Buffer.from(base64Key, 'base64').toString('utf-8');
            console.log('[Firebase] Using base64-decoded private key');
            return decoded;
        } catch (e) {
            console.error('[Firebase] Failed to decode base64 private key:', e);
        }
    }

    // Option 2: Plain text with escaped newlines (default)
    const plainKey = process.env.FIREBASE_PRIVATE_KEY;
    if (plainKey) {
        // Replace escaped \n with actual newlines
        const decoded = plainKey.replace(/\\n/g, '\n');
        console.log('[Firebase] Using plain-text private key');
        return decoded;
    }

    return undefined;
}

function getFirebaseApp(): App {
    if (app) return app;

    const apps = getApps();
    if (apps.length > 0) {
        app = apps[0];
        return app;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = decodePrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
        const missing = [];
        if (!projectId) missing.push('FIREBASE_PROJECT_ID');
        if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY or FIREBASE_PRIVATE_KEY_BASE64');

        throw new Error(
            `Firebase configuration missing: ${missing.join(', ')}. ` +
            'For AWS Amplify, use FIREBASE_PRIVATE_KEY_BASE64 with base64-encoded key.'
        );
    }

    app = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });

    console.log('[Firebase] Admin SDK initialized successfully');
    return app;
}

export function getDb(): Firestore {
    if (db) return db;

    getFirebaseApp();
    db = getFirestore();

    return db;
}

// Collection names
export const COLLECTIONS = {
    USER_PROFILES: 'userProfiles',
    ANALYTICS_EVENTS: 'analyticsEvents',
    AI_USAGE: 'aiUsage',
} as const;
