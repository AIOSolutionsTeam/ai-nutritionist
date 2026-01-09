/**
 * Response Caching Service
 * 
 * 3-tier caching system to reduce AI API calls:
 * - Tier 1: Product Comparison Cache - for "what's the difference between X and Y?"
 * - Tier 2: Profile-Based Cache - questions cached per user profile cluster
 * - Tier 3: FAQ Cache - generic questions like "what is vitamin D?"
 * 
 * Auto-caches after 2nd occurrence of similar questions.
 */

import { getDb, COLLECTIONS } from './firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { IUserProfile } from './db';
import { ProductSearchResult, fetchAllProductsWithParsedData } from './shopify';

// ==================== INTERFACES ====================

/**
 * Profile cluster for grouping similar users
 */
export interface ProfileCluster {
    ageRange: '18-30' | '31-50' | '51+';
    weightRange: 'under60' | '60-80' | '80-100' | 'over100';
    primaryGoal: string;
    medicalConditions: string[]; // ['diabetes', 'hypertension'] etc.
    diet: string | null; // 'vegan' | 'halal' | 'vegetarian' | null
}

/**
 * Base cache entry interface
 */
interface BaseCacheEntry {
    id?: string;
    questionNormalized: string;
    response: string;
    recommendedProducts: ProductSearchResult[];
    hitCount: number;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date; // TTL for cache invalidation (90 days)
}

/**
 * Profile-based cache entry (Tier 2)
 */
export interface ProfileCacheEntry extends BaseCacheEntry {
    profileClusterHash: string;
    profileCluster: ProfileCluster;
}

/**
 * Product comparison cache entry (Tier 1)
 */
export interface ProductCacheEntry extends BaseCacheEntry {
    productHandles: string[]; // sorted list of product handles
    questionType: 'comparison' | 'info' | 'usage';
}

/**
 * FAQ cache entry (Tier 3)
 */
export interface FAQCacheEntry extends BaseCacheEntry {
    category: 'general' | 'supplements' | 'health';
}

/**
 * Frequency tracker for auto-caching
 */
interface FrequencyEntry {
    id?: string;
    questionNormalized: string;
    profileClusterHash: string | null;
    productHandles: string[] | null;
    count: number;
    lastResponse: string;
    lastProducts: ProductSearchResult[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Cache lookup result
 */
export interface CacheLookupResult {
    type: 'product' | 'profile' | 'faq';
    response: {
        reply: string;
        products: Array<{ name: string; category: string; description: string }>;
        recommendedProducts: ProductSearchResult[];
        disclaimer?: string;
    };
    cacheId: string;
}

// ==================== CONSTANTS ====================

const CACHE_TTL_DAYS = 90;
const CACHE_THRESHOLD = 2; // Cache after 2nd occurrence

// Filler words to remove during normalization
const FILLER_WORDS = [
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'à', 'au', 'aux',
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'ce', 'cette', 'ces', 'cet',
    'qui', 'que', 'quoi', 'dont', 'où',
    'est', 'sont', 'suis', 'es', 'sommes', 'êtes',
    'ai', 'as', 'a', 'avons', 'avez', 'ont',
    'pour', 'sur', 'sous', 'dans', 'avec', 'sans', 'par', 'entre',
    'plus', 'moins', 'très', 'bien', 'mal',
    'merci', 'svp', 's\'il', 'vous', 'plaît', 'plait',
    'bonjour', 'bonsoir', 'salut', 'hello', 'hi',
    'pouvez', 'pourriez', 'peux', 'puis',
    'me', 'moi', 'te', 'toi', 'se', 'lui', 'leur',
    'quel', 'quelle', 'quels', 'quelles',
    'comment', 'pourquoi', 'quand',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'can', 'could', 'would', 'should', 'will', 'may', 'might',
    'please', 'thank', 'thanks', 'you', 'your', 'my', 'me', 'i',
];

// Common product name abbreviations mapping
const PRODUCT_ABBREVIATIONS: { [key: string]: string[] } = {
    'vitamine': ['vit', 'vitamin'],
    'magnésium': ['mag', 'magnesium'],
    'oméga': ['omega', 'ω'],
    'probiotique': ['probio', 'probiotic'],
    'collagène': ['collagen', 'colla'],
    'protéine': ['protein', 'prot'],
    'créatine': ['creatine', 'creat'],
    'mélatonine': ['melatonin', 'melat'],
    'ashwagandha': ['ashwa', 'withania'],
    'glucosamine': ['gluco'],
    'multivitamine': ['multivit', 'multi'],
};

// ==================== CACHE SERVICE ====================

export class ResponseCacheService {
    private static instance: ResponseCacheService;
    private productCatalogCache: ProductSearchResult[] | null = null;
    private catalogCacheTime: number | null = null;
    private readonly CATALOG_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

    private constructor() { }

    public static getInstance(): ResponseCacheService {
        if (!ResponseCacheService.instance) {
            ResponseCacheService.instance = new ResponseCacheService();
        }
        return ResponseCacheService.instance;
    }

    // ==================== PROFILE CLUSTERING ====================

    /**
     * Generate a profile cluster from user profile
     */
    public generateProfileCluster(profile: IUserProfile): ProfileCluster {
        // Age ranges
        let ageRange: ProfileCluster['ageRange'];
        if (profile.age <= 30) ageRange = '18-30';
        else if (profile.age <= 50) ageRange = '31-50';
        else ageRange = '51+';

        // Weight ranges (kg)
        let weightRange: ProfileCluster['weightRange'];
        if (profile.weight < 60) weightRange = 'under60';
        else if (profile.weight < 80) weightRange = '60-80';
        else if (profile.weight < 100) weightRange = '80-100';
        else weightRange = 'over100';

        // Primary goal (first goal in array)
        const primaryGoal = profile.goals?.[0] || 'general';

        // Medical conditions list
        const medicalKeywords = ['diabetes', 'hypertension', 'heart', 'thyroid', 'cholesterol', 'arthritis'];
        const medicalConditions = (profile.allergies || [])
            .filter(a => medicalKeywords.some(m => a.toLowerCase().includes(m)))
            .map(a => a.toLowerCase());

        // Diet preference
        const dietPrefs = ['vegan', 'vegetarian', 'halal', 'kosher'];
        const diet = profile.allergies?.find(a =>
            dietPrefs.some(d => a.toLowerCase().includes(d))
        )?.toLowerCase() || null;

        return { ageRange, weightRange, primaryGoal, medicalConditions, diet };
    }

    /**
     * Generate a hash string for a profile cluster
     */
    public generateProfileClusterHash(cluster: ProfileCluster): string {
        const conditions = cluster.medicalConditions.sort().join(',') || 'none';
        return `${cluster.ageRange}|${cluster.weightRange}|${cluster.primaryGoal}|${conditions}|${cluster.diet || 'none'}`;
    }

    // ==================== QUESTION NORMALIZATION ====================

    /**
     * Normalize a question for cache matching
     * - Lowercase
     * - Remove filler words
     * - Remove punctuation
     * - Sort remaining words alphabetically
     */
    public normalizeQuestion(question: string): string {
        // Lowercase and normalize unicode
        let normalized = question.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/['']/g, "'")
            .replace(/[^\w\s']/g, ' ') // Remove punctuation except apostrophe
            .replace(/\s+/g, ' ')
            .trim();

        // Split into words and filter out filler words
        const words = normalized.split(' ')
            .filter(word => word.length > 1 && !FILLER_WORDS.includes(word));

        // Sort alphabetically for order-independent matching
        return words.sort().join(' ');
    }

    // ==================== PRODUCT MATCHING ====================

    /**
     * Get product catalog (cached)
     */
    private async getProductCatalog(): Promise<ProductSearchResult[]> {
        const now = Date.now();
        if (this.productCatalogCache && this.catalogCacheTime &&
            now - this.catalogCacheTime < this.CATALOG_CACHE_TTL_MS) {
            return this.productCatalogCache;
        }

        try {
            const products = await fetchAllProductsWithParsedData();
            this.productCatalogCache = products;
            this.catalogCacheTime = now;
            return products;
        } catch (error) {
            console.error('[ResponseCache] Error fetching product catalog:', error);
            return this.productCatalogCache || [];
        }
    }

    /**
     * Extract product mentions from question using fuzzy matching
     */
    public async extractProductMentions(question: string): Promise<string[]> {
        const catalog = await this.getProductCatalog();
        const normalized = question.toLowerCase()
            .replace(/['']/g, "'")
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ');

        const matches: string[] = [];

        for (const product of catalog) {
            if (!product.handle) continue;

            // Create search terms from product title
            const titleLower = product.title.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            // Split title into meaningful words (3+ chars)
            const titleWords = titleLower.split(/[\s\-–—]+/)
                .filter(w => w.length >= 3);

            // Add abbreviations
            const allSearchTerms = new Set<string>(titleWords);
            for (const [full, abbrevs] of Object.entries(PRODUCT_ABBREVIATIONS)) {
                if (titleLower.includes(full)) {
                    abbrevs.forEach(a => allSearchTerms.add(a));
                }
            }

            // Also add product handle parts
            const handleParts = product.handle.split('-').filter(p => p.length >= 3);
            handleParts.forEach(p => allSearchTerms.add(p));

            // Check if any keyword appears in question
            for (const keyword of allSearchTerms) {
                if (keyword.length >= 3 && normalized.includes(keyword)) {
                    matches.push(product.handle);
                    break;
                }
            }
        }

        return [...new Set(matches)].sort(); // Dedupe and sort
    }

    /**
     * Detect if this is a product comparison question
     */
    public isProductComparisonQuestion(question: string): boolean {
        const comparisonPatterns = [
            /diff[eé]rence\s+entre/i,
            /comparer?\s/i,
            /vs\.?\s/i,
            /versus\s/i,
            /ou\s+(?:le|la|l')\s/i,
            /\bet\b.*\bou\b/i,
            /lequel\s/i,
            /laquelle\s/i,
            /meilleur\s+entre/i,
            /choisir\s+entre/i,
        ];
        return comparisonPatterns.some(p => p.test(question));
    }

    // ==================== CACHE LOOKUP ====================

    /**
     * Look up a question in the cache (3-tier cascade)
     */
    public async lookup(
        question: string,
        profile: IUserProfile | null
    ): Promise<CacheLookupResult | null> {
        const normalizedQuestion = this.normalizeQuestion(question);
        const now = new Date();

        console.log('[ResponseCache] Looking up cache for:', normalizedQuestion.substring(0, 50));

        // Tier 1: Product Comparison Cache
        const productHandles = await this.extractProductMentions(question);
        if (productHandles.length >= 2 && this.isProductComparisonQuestion(question)) {
            console.log('[ResponseCache] Checking Tier 1 (Product Comparison)...');
            const productResult = await this.lookupProductCache(productHandles, normalizedQuestion, now);
            if (productResult) {
                console.log('[ResponseCache] ✅ Tier 1 HIT');
                return productResult;
            }
        }

        // Tier 2: Profile-Based Cache
        if (profile) {
            console.log('[ResponseCache] Checking Tier 2 (Profile-Based)...');
            const cluster = this.generateProfileCluster(profile);
            const clusterHash = this.generateProfileClusterHash(cluster);
            const profileResult = await this.lookupProfileCache(clusterHash, normalizedQuestion, now);
            if (profileResult) {
                console.log('[ResponseCache] ✅ Tier 2 HIT');
                return profileResult;
            }
        }

        // Tier 3: FAQ Cache
        console.log('[ResponseCache] Checking Tier 3 (FAQ)...');
        const faqResult = await this.lookupFAQCache(normalizedQuestion, now);
        if (faqResult) {
            console.log('[ResponseCache] ✅ Tier 3 HIT');
            return faqResult;
        }

        console.log('[ResponseCache] ❌ Cache MISS');
        return null;
    }

    private async lookupProductCache(
        productHandles: string[],
        normalizedQuestion: string,
        now: Date
    ): Promise<CacheLookupResult | null> {
        try {
            const db = getDb();
            const sortedHandles = productHandles.sort();

            const snapshot = await db.collection(COLLECTIONS.RESPONSE_CACHE_PRODUCT)
                .where('productHandles', '==', sortedHandles)
                .where('expiresAt', '>', Timestamp.fromDate(now))
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data() as ProductCacheEntry;

                // Update hit count
                await doc.ref.update({
                    hitCount: FieldValue.increment(1),
                    updatedAt: Timestamp.now()
                });

                return {
                    type: 'product',
                    response: {
                        reply: data.response,
                        products: [],
                        recommendedProducts: data.recommendedProducts,
                    },
                    cacheId: doc.id
                };
            }
        } catch (error) {
            console.error('[ResponseCache] Product cache lookup error:', error);
        }
        return null;
    }

    private async lookupProfileCache(
        clusterHash: string,
        normalizedQuestion: string,
        now: Date
    ): Promise<CacheLookupResult | null> {
        try {
            const db = getDb();

            const snapshot = await db.collection(COLLECTIONS.RESPONSE_CACHE_PROFILE)
                .where('profileClusterHash', '==', clusterHash)
                .where('questionNormalized', '==', normalizedQuestion)
                .where('expiresAt', '>', Timestamp.fromDate(now))
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data() as ProfileCacheEntry;

                // Update hit count
                await doc.ref.update({
                    hitCount: FieldValue.increment(1),
                    updatedAt: Timestamp.now()
                });

                return {
                    type: 'profile',
                    response: {
                        reply: data.response,
                        products: [],
                        recommendedProducts: data.recommendedProducts,
                    },
                    cacheId: doc.id
                };
            }
        } catch (error) {
            console.error('[ResponseCache] Profile cache lookup error:', error);
        }
        return null;
    }

    private async lookupFAQCache(
        normalizedQuestion: string,
        now: Date
    ): Promise<CacheLookupResult | null> {
        try {
            const db = getDb();

            const snapshot = await db.collection(COLLECTIONS.RESPONSE_CACHE_FAQ)
                .where('questionNormalized', '==', normalizedQuestion)
                .where('expiresAt', '>', Timestamp.fromDate(now))
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data() as FAQCacheEntry;

                // Update hit count
                await doc.ref.update({
                    hitCount: FieldValue.increment(1),
                    updatedAt: Timestamp.now()
                });

                return {
                    type: 'faq',
                    response: {
                        reply: data.response,
                        products: [],
                        recommendedProducts: data.recommendedProducts,
                    },
                    cacheId: doc.id
                };
            }
        } catch (error) {
            console.error('[ResponseCache] FAQ cache lookup error:', error);
        }
        return null;
    }

    // ==================== CACHE SAVE ====================

    /**
     * Track question frequency and save to cache if threshold met
     */
    public async trackAndSave(
        question: string,
        response: { reply: string; products?: unknown[] },
        profile: IUserProfile | null,
        recommendedProducts: ProductSearchResult[]
    ): Promise<void> {
        const normalizedQuestion = this.normalizeQuestion(question);
        const productHandles = await this.extractProductMentions(question);
        const isComparison = productHandles.length >= 2 && this.isProductComparisonQuestion(question);

        let clusterHash: string | null = null;
        let cluster: ProfileCluster | null = null;
        if (profile) {
            cluster = this.generateProfileCluster(profile);
            clusterHash = this.generateProfileClusterHash(cluster);
        }

        try {
            const db = getDb();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

            // Create frequency key
            const frequencyKey = isComparison
                ? `product:${productHandles.sort().join(',')}`
                : clusterHash
                    ? `profile:${clusterHash}:${normalizedQuestion}`
                    : `faq:${normalizedQuestion}`;

            // Check/update frequency
            const freqRef = db.collection(COLLECTIONS.CACHE_FREQUENCY).doc(frequencyKey);
            const freqDoc = await freqRef.get();

            if (freqDoc.exists) {
                const freqData = freqDoc.data() as FrequencyEntry;
                const newCount = freqData.count + 1;

                await freqRef.update({
                    count: newCount,
                    lastResponse: response.reply,
                    lastProducts: recommendedProducts,
                    updatedAt: Timestamp.now()
                });

                // If threshold met, save to appropriate cache
                if (newCount >= CACHE_THRESHOLD) {
                    console.log(`[ResponseCache] Threshold met (${newCount}), saving to cache...`);
                    await this.saveToCache(
                        normalizedQuestion,
                        response.reply,
                        recommendedProducts,
                        profile,
                        cluster,
                        clusterHash,
                        productHandles,
                        isComparison,
                        expiresAt
                    );
                }
            } else {
                // First occurrence - create frequency entry
                const freqEntry: FrequencyEntry = {
                    questionNormalized: normalizedQuestion,
                    profileClusterHash: clusterHash,
                    productHandles: productHandles.length > 0 ? productHandles : null,
                    count: 1,
                    lastResponse: response.reply,
                    lastProducts: recommendedProducts,
                    createdAt: now,
                    updatedAt: now
                };

                await freqRef.set({
                    ...freqEntry,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });

                console.log('[ResponseCache] First occurrence tracked');
            }
        } catch (error) {
            console.error('[ResponseCache] Track and save error:', error);
        }
    }

    private async saveToCache(
        normalizedQuestion: string,
        response: string,
        recommendedProducts: ProductSearchResult[],
        profile: IUserProfile | null,
        cluster: ProfileCluster | null,
        clusterHash: string | null,
        productHandles: string[],
        isComparison: boolean,
        expiresAt: Date
    ): Promise<void> {
        const db = getDb();
        const now = new Date();

        try {
            if (isComparison && productHandles.length >= 2) {
                // Save to Product Cache (Tier 1)
                const entry: Omit<ProductCacheEntry, 'id'> = {
                    questionNormalized: normalizedQuestion,
                    response,
                    recommendedProducts,
                    productHandles: productHandles.sort(),
                    questionType: 'comparison',
                    hitCount: 0,
                    createdAt: now,
                    updatedAt: now,
                    expiresAt
                };

                await db.collection(COLLECTIONS.RESPONSE_CACHE_PRODUCT).add({
                    ...entry,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    expiresAt: Timestamp.fromDate(expiresAt)
                });
                console.log('[ResponseCache] Saved to Product Cache (Tier 1)');

            } else if (cluster && clusterHash) {
                // Save to Profile Cache (Tier 2)
                const entry: Omit<ProfileCacheEntry, 'id'> = {
                    questionNormalized: normalizedQuestion,
                    response,
                    recommendedProducts,
                    profileClusterHash: clusterHash,
                    profileCluster: cluster,
                    hitCount: 0,
                    createdAt: now,
                    updatedAt: now,
                    expiresAt
                };

                await db.collection(COLLECTIONS.RESPONSE_CACHE_PROFILE).add({
                    ...entry,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    expiresAt: Timestamp.fromDate(expiresAt)
                });
                console.log('[ResponseCache] Saved to Profile Cache (Tier 2)');

            } else {
                // Save to FAQ Cache (Tier 3)
                const category = this.categorizeQuestion(normalizedQuestion);
                const entry: Omit<FAQCacheEntry, 'id'> = {
                    questionNormalized: normalizedQuestion,
                    response,
                    recommendedProducts,
                    category,
                    hitCount: 0,
                    createdAt: now,
                    updatedAt: now,
                    expiresAt
                };

                await db.collection(COLLECTIONS.RESPONSE_CACHE_FAQ).add({
                    ...entry,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    expiresAt: Timestamp.fromDate(expiresAt)
                });
                console.log('[ResponseCache] Saved to FAQ Cache (Tier 3)');
            }
        } catch (error) {
            console.error('[ResponseCache] Save to cache error:', error);
        }
    }

    private categorizeQuestion(normalized: string): FAQCacheEntry['category'] {
        const supplementKeywords = ['vitamine', 'vitamin', 'magnesium', 'omega', 'probio', 'collagen', 'zinc', 'fer', 'iron', 'calcium'];
        const healthKeywords = ['sante', 'health', 'maladie', 'symptome', 'douleur', 'fatigue', 'sommeil', 'sleep', 'stress'];

        if (supplementKeywords.some(k => normalized.includes(k))) {
            return 'supplements';
        }
        if (healthKeywords.some(k => normalized.includes(k))) {
            return 'health';
        }
        return 'general';
    }

    // ==================== CACHE STATISTICS ====================

    /**
     * Get cache statistics for monitoring
     */
    public async getStats(): Promise<{
        productCacheCount: number;
        profileCacheCount: number;
        faqCacheCount: number;
        frequencyTrackerCount: number;
    }> {
        const db = getDb();
        const now = Timestamp.now();

        try {
            const [productSnap, profileSnap, faqSnap, freqSnap] = await Promise.all([
                db.collection(COLLECTIONS.RESPONSE_CACHE_PRODUCT)
                    .where('expiresAt', '>', now)
                    .count()
                    .get(),
                db.collection(COLLECTIONS.RESPONSE_CACHE_PROFILE)
                    .where('expiresAt', '>', now)
                    .count()
                    .get(),
                db.collection(COLLECTIONS.RESPONSE_CACHE_FAQ)
                    .where('expiresAt', '>', now)
                    .count()
                    .get(),
                db.collection(COLLECTIONS.CACHE_FREQUENCY)
                    .count()
                    .get(),
            ]);

            return {
                productCacheCount: productSnap.data().count,
                profileCacheCount: profileSnap.data().count,
                faqCacheCount: faqSnap.data().count,
                frequencyTrackerCount: freqSnap.data().count,
            };
        } catch (error) {
            console.error('[ResponseCache] Error getting stats:', error);
            return {
                productCacheCount: 0,
                profileCacheCount: 0,
                faqCacheCount: 0,
                frequencyTrackerCount: 0,
            };
        }
    }
}

// Export singleton instance
export const responseCacheService = ResponseCacheService.getInstance();
