import { getDb, COLLECTIONS } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';

export interface IAIUsage {
    id?: string;
    timestamp: Date;
    provider: 'openai' | 'gemini';
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    requestType: 'chat' | 'plan_generation';
    userId?: string;
    sessionId?: string;
}

// Helper to convert Firestore Timestamp to Date
function convertTimestamps<T extends object>(doc: T): T {
    const result = { ...doc };
    for (const key in result) {
        const value = result[key];
        if (value instanceof Timestamp) {
            (result as Record<string, unknown>)[key] = value.toDate();
        }
    }
    return result;
}

// Pricing per 1M tokens (as of late 2024)
const PRICING = {
    openai: {
        'gpt-4': { input: 30, output: 60 },
        'gpt-4-turbo': { input: 10, output: 30 },
        'gpt-4-turbo-preview': { input: 10, output: 30 },
        'gpt-4o': { input: 2.5, output: 10 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        default: { input: 2.5, output: 10 },
    },
    gemini: {
        'gemini-2.0-flash': { input: 0.075, output: 0.3 },
        'gemini-1.5-flash': { input: 0.075, output: 0.3 },
        'gemini-1.5-pro': { input: 1.25, output: 5 },
        'gemini-pro': { input: 0.5, output: 1.5 },
        default: { input: 0.075, output: 0.3 },
    },
};

export function calculateCost(provider: 'openai' | 'gemini', model: string, promptTokens: number, completionTokens: number): number {
    const providerPricing = PRICING[provider];
    const modelPricing = providerPricing[model as keyof typeof providerPricing] || providerPricing.default;

    const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
    const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

    return Math.round((inputCost + outputCost) * 10000) / 10000;
}

class AIUsageService {
    private static instance: AIUsageService;

    private constructor() { }

    public static getInstance(): AIUsageService {
        if (!AIUsageService.instance) {
            AIUsageService.instance = new AIUsageService();
        }
        return AIUsageService.instance;
    }

    async trackUsage(data: {
        provider: 'openai' | 'gemini';
        modelName: string;
        promptTokens: number;
        completionTokens: number;
        requestType: 'chat' | 'plan_generation';
        userId?: string;
        sessionId?: string;
    }): Promise<IAIUsage> {
        const db = getDb();
        const totalTokens = data.promptTokens + data.completionTokens;
        const estimatedCost = calculateCost(data.provider, data.modelName, data.promptTokens, data.completionTokens);

        const docData = {
            timestamp: Timestamp.fromDate(new Date()),
            provider: data.provider,
            modelName: data.modelName,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            totalTokens,
            estimatedCost,
            requestType: data.requestType,
            userId: data.userId || null,
            sessionId: data.sessionId || null,
        };

        const docRef = await db.collection(COLLECTIONS.AI_USAGE).add(docData);
        const savedDoc = await docRef.get();

        console.log(`[AIUsage] Tracked: ${data.provider}/${data.modelName} - ${totalTokens} tokens, $${estimatedCost}`);

        return {
            id: savedDoc.id,
            ...convertTimestamps(savedDoc.data() as Omit<IAIUsage, 'id'>),
        };
    }

    // Helper to get usage data in a date range
    private async getUsageInRange(startDate?: Date, endDate?: Date): Promise<IAIUsage[]> {
        const db = getDb();
        let query = db.collection(COLLECTIONS.AI_USAGE).orderBy('timestamp', 'desc');

        if (startDate) {
            query = query.where('timestamp', '>=', Timestamp.fromDate(startDate));
        }
        if (endDate) {
            query = query.where('timestamp', '<=', Timestamp.fromDate(endDate));
        }

        const snapshot = await query.get();
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...convertTimestamps(doc.data() as Omit<IAIUsage, 'id'>),
        }));
    }

    async getUsageStats(
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        totalRequests: number;
        totalTokens: number;
        totalCost: number;
        byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
        byRequestType: Record<string, { requests: number; tokens: number; cost: number }>;
        dailyUsage: Array<{ date: string; requests: number; tokens: number; cost: number }>;
        todayVsYesterday: {
            today: { requests: number; tokens: number; cost: number };
            yesterday: { requests: number; tokens: number; cost: number };
            change: { requests: number; tokens: number; cost: number };
        };
    }> {
        const usageData = await this.getUsageInRange(startDate, endDate);

        // Calculate totals
        const totalRequests = usageData.length;
        const totalTokens = usageData.reduce((sum, u) => sum + u.totalTokens, 0);
        const totalCost = usageData.reduce((sum, u) => sum + u.estimatedCost, 0);

        // By provider
        const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};
        for (const usage of usageData) {
            if (!byProvider[usage.provider]) {
                byProvider[usage.provider] = { requests: 0, tokens: 0, cost: 0 };
            }
            byProvider[usage.provider].requests++;
            byProvider[usage.provider].tokens += usage.totalTokens;
            byProvider[usage.provider].cost += usage.estimatedCost;
        }
        // Round costs
        for (const provider in byProvider) {
            byProvider[provider].cost = Math.round(byProvider[provider].cost * 10000) / 10000;
        }

        // By request type
        const byRequestType: Record<string, { requests: number; tokens: number; cost: number }> = {};
        for (const usage of usageData) {
            if (!byRequestType[usage.requestType]) {
                byRequestType[usage.requestType] = { requests: 0, tokens: 0, cost: 0 };
            }
            byRequestType[usage.requestType].requests++;
            byRequestType[usage.requestType].tokens += usage.totalTokens;
            byRequestType[usage.requestType].cost += usage.estimatedCost;
        }
        for (const type in byRequestType) {
            byRequestType[type].cost = Math.round(byRequestType[type].cost * 10000) / 10000;
        }

        // Daily usage (last 14 days)
        const dailyMap = new Map<string, { requests: number; tokens: number; cost: number }>();
        for (const usage of usageData) {
            const dateKey = usage.timestamp.toISOString().split('T')[0];
            const current = dailyMap.get(dateKey) || { requests: 0, tokens: 0, cost: 0 };
            current.requests++;
            current.tokens += usage.totalTokens;
            current.cost += usage.estimatedCost;
            dailyMap.set(dateKey, current);
        }
        const dailyUsage = Array.from(dailyMap.entries())
            .map(([date, stats]) => ({
                date,
                requests: stats.requests,
                tokens: stats.tokens,
                cost: Math.round(stats.cost * 10000) / 10000,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-14);

        // Today vs Yesterday
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const todayUsage = usageData.filter((u) => u.timestamp >= todayStart);
        const yesterdayUsage = usageData.filter((u) => u.timestamp >= yesterdayStart && u.timestamp < todayStart);

        const today = {
            requests: todayUsage.length,
            tokens: todayUsage.reduce((sum, u) => sum + u.totalTokens, 0),
            cost: Math.round(todayUsage.reduce((sum, u) => sum + u.estimatedCost, 0) * 10000) / 10000,
        };

        const yesterday = {
            requests: yesterdayUsage.length,
            tokens: yesterdayUsage.reduce((sum, u) => sum + u.totalTokens, 0),
            cost: Math.round(yesterdayUsage.reduce((sum, u) => sum + u.estimatedCost, 0) * 10000) / 10000,
        };

        const calcChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            totalRequests,
            totalTokens,
            totalCost: Math.round(totalCost * 10000) / 10000,
            byProvider,
            byRequestType,
            dailyUsage,
            todayVsYesterday: {
                today,
                yesterday,
                change: {
                    requests: calcChange(today.requests, yesterday.requests),
                    tokens: calcChange(today.tokens, yesterday.tokens),
                    cost: calcChange(today.cost, yesterday.cost),
                },
            },
        };
    }
}

export const aiUsageService = AIUsageService.getInstance();
