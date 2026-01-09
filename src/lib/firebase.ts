import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Firebase Admin SDK configuration
// Set these environment variables in your .env file:
// FIREBASE_PROJECT_ID=your-project-id
// FIREBASE_CLIENT_EMAIL=your-service-account-email
// FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

let app: App | undefined;
let db: Firestore | undefined;

function getFirebaseApp(): App {
    if (app) return app;

    const apps = getApps();
    if (apps.length > 0) {
        app = apps[0];
        return app;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase configuration missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
        );
    }

    app = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });

    console.log('Firebase Admin SDK initialized successfully');
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
    // Response caching collections
    RESPONSE_CACHE_PRODUCT: 'responseCacheProduct',
    RESPONSE_CACHE_PROFILE: 'responseCacheProfile',
    RESPONSE_CACHE_FAQ: 'responseCacheFAQ',
    CACHE_FREQUENCY: 'cacheFrequency',
} as const;

