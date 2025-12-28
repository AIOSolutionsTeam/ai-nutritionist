import mongoose, { Schema, Document } from 'mongoose';

export interface IAIUsage extends Document {
    timestamp: Date;
    provider: 'openai' | 'gemini';
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number; // in USD
    requestType: 'chat' | 'plan_generation';
    userId?: string;
    sessionId?: string;
}

const AIUsageSchema = new Schema<IAIUsage>({
    timestamp: { type: Date, default: Date.now, index: true },
    provider: { type: String, enum: ['openai', 'gemini'], required: true, index: true },
    modelName: { type: String, required: true },
    promptTokens: { type: Number, required: true, default: 0 },
    completionTokens: { type: Number, required: true, default: 0 },
    totalTokens: { type: Number, required: true, default: 0 },
    estimatedCost: { type: Number, required: true, default: 0 },
    requestType: { type: String, enum: ['chat', 'plan_generation'], required: true, index: true },
    userId: { type: String, index: true },
    sessionId: { type: String }
});

// Create compound indexes for efficient queries
AIUsageSchema.index({ timestamp: -1, provider: 1 });
AIUsageSchema.index({ timestamp: -1, requestType: 1 });

export const AIUsage = mongoose.models.AIUsage || mongoose.model<IAIUsage>('AIUsage', AIUsageSchema);

// Pricing per 1M tokens (as of late 2024)
// These are approximate and should be updated as pricing changes
const PRICING = {
    openai: {
        'gpt-4': { input: 30, output: 60 },
        'gpt-4-turbo': { input: 10, output: 30 },
        'gpt-4-turbo-preview': { input: 10, output: 30 },
        'gpt-4o': { input: 2.5, output: 10 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
        'default': { input: 2.5, output: 10 }
    },
    gemini: {
        'gemini-2.0-flash': { input: 0.075, output: 0.3 },
        'gemini-1.5-flash': { input: 0.075, output: 0.3 },
        'gemini-1.5-pro': { input: 1.25, output: 5 },
        'gemini-pro': { input: 0.5, output: 1.5 },
        'default': { input: 0.075, output: 0.3 }
    }
};

export function calculateCost(
    provider: 'openai' | 'gemini',
    model: string,
    promptTokens: number,
    completionTokens: number
): number {
    const providerPricing = PRICING[provider];
    const modelPricing = providerPricing[model as keyof typeof providerPricing] || providerPricing.default;

    // Cost per 1M tokens, so divide by 1,000,000
    const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
    const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

    return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
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
        const totalTokens = data.promptTokens + data.completionTokens;
        const estimatedCost = calculateCost(data.provider, data.modelName, data.promptTokens, data.completionTokens);

        const usage = new AIUsage({
            timestamp: new Date(),
            provider: data.provider,
            modelName: data.modelName,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            totalTokens,
            estimatedCost,
            requestType: data.requestType,
            userId: data.userId,
            sessionId: data.sessionId
        });

        await usage.save();
        console.log(`[AIUsage] Tracked: ${data.provider}/${data.modelName} - ${totalTokens} tokens, $${estimatedCost}`);
        return usage;
    }

    async getUsageStats(startDate?: Date, endDate?: Date): Promise<{
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
        const matchStage: Record<string, unknown> = {};
        if (startDate || endDate) {
            matchStage.timestamp = {};
            if (startDate) (matchStage.timestamp as Record<string, Date>).$gte = startDate;
            if (endDate) (matchStage.timestamp as Record<string, Date>).$lte = endDate;
        }

        // Get totals
        const totals = await AIUsage.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRequests: { $sum: 1 },
                    totalTokens: { $sum: '$totalTokens' },
                    totalCost: { $sum: '$estimatedCost' }
                }
            }
        ]);

        // Get by provider
        const byProvider = await AIUsage.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$provider',
                    requests: { $sum: 1 },
                    tokens: { $sum: '$totalTokens' },
                    cost: { $sum: '$estimatedCost' }
                }
            }
        ]);

        // Get by request type
        const byRequestType = await AIUsage.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$requestType',
                    requests: { $sum: 1 },
                    tokens: { $sum: '$totalTokens' },
                    cost: { $sum: '$estimatedCost' }
                }
            }
        ]);

        // Get daily usage (last 14 days)
        const dailyUsage = await AIUsage.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    requests: { $sum: 1 },
                    tokens: { $sum: '$totalTokens' },
                    cost: { $sum: '$estimatedCost' }
                }
            },
            { $sort: { _id: 1 } },
            { $limit: 14 }
        ]);

        // Today vs Yesterday
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const todayStats = await AIUsage.aggregate([
            { $match: { timestamp: { $gte: todayStart } } },
            {
                $group: {
                    _id: null,
                    requests: { $sum: 1 },
                    tokens: { $sum: '$totalTokens' },
                    cost: { $sum: '$estimatedCost' }
                }
            }
        ]);

        const yesterdayStats = await AIUsage.aggregate([
            { $match: { timestamp: { $gte: yesterdayStart, $lt: todayStart } } },
            {
                $group: {
                    _id: null,
                    requests: { $sum: 1 },
                    tokens: { $sum: '$totalTokens' },
                    cost: { $sum: '$estimatedCost' }
                }
            }
        ]);

        const today = todayStats[0] || { requests: 0, tokens: 0, cost: 0 };
        const yesterday = yesterdayStats[0] || { requests: 0, tokens: 0, cost: 0 };

        const calcChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        // Format results
        const providerMap: Record<string, { requests: number; tokens: number; cost: number }> = {};
        byProvider.forEach(p => {
            providerMap[p._id] = { requests: p.requests, tokens: p.tokens, cost: Math.round(p.cost * 10000) / 10000 };
        });

        const typeMap: Record<string, { requests: number; tokens: number; cost: number }> = {};
        byRequestType.forEach(t => {
            typeMap[t._id] = { requests: t.requests, tokens: t.tokens, cost: Math.round(t.cost * 10000) / 10000 };
        });

        return {
            totalRequests: totals[0]?.totalRequests || 0,
            totalTokens: totals[0]?.totalTokens || 0,
            totalCost: Math.round((totals[0]?.totalCost || 0) * 10000) / 10000,
            byProvider: providerMap,
            byRequestType: typeMap,
            dailyUsage: dailyUsage.map(d => ({
                date: d._id,
                requests: d.requests,
                tokens: d.tokens,
                cost: Math.round(d.cost * 10000) / 10000
            })),
            todayVsYesterday: {
                today: { requests: today.requests, tokens: today.tokens, cost: Math.round(today.cost * 10000) / 10000 },
                yesterday: { requests: yesterday.requests, tokens: yesterday.tokens, cost: Math.round(yesterday.cost * 10000) / 10000 },
                change: {
                    requests: calcChange(today.requests, yesterday.requests),
                    tokens: calcChange(today.tokens, yesterday.tokens),
                    cost: calcChange(today.cost, yesterday.cost)
                }
            }
        };
    }
}

export const aiUsageService = AIUsageService.getInstance();
