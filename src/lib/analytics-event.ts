import mongoose, { Document, Schema, Model } from 'mongoose';

// AnalyticsEvent interface
export interface IAnalyticsEvent extends Document {
    event: string;
    properties: Record<string, unknown>;
    userId?: string;
    sessionId: string;
    timestamp: Date;
    createdAt: Date;
}

// AnalyticsEvent schema
const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
    event: {
        type: String,
        required: true,
        index: true
    },
    properties: {
        type: Schema.Types.Mixed,
        default: {}
    },
    userId: {
        type: String,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
AnalyticsEventSchema.index({ event: 1, timestamp: -1 });
AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ sessionId: 1, event: 1 });

// Create the model
export const AnalyticsEvent: Model<IAnalyticsEvent> = mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

// Analytics Event Service
class AnalyticsEventService {
    private static instance: AnalyticsEventService;

    private constructor() { }

    public static getInstance(): AnalyticsEventService {
        if (!AnalyticsEventService.instance) {
            AnalyticsEventService.instance = new AnalyticsEventService();
        }
        return AnalyticsEventService.instance;
    }

    // Create a new analytics event
    public async createEvent(eventData: {
        event: string;
        properties?: Record<string, unknown>;
        userId?: string;
        sessionId: string;
        timestamp?: Date;
    }): Promise<IAnalyticsEvent> {
        try {
            const analyticsEvent = new AnalyticsEvent({
                ...eventData,
                timestamp: eventData.timestamp || new Date()
            });
            return await analyticsEvent.save();
        } catch (error) {
            console.error('Error creating analytics event:', error);
            throw error;
        }
    }

    // Get events with filters
    public async getEvents(filters: {
        eventType?: string;
        userId?: string;
        sessionId?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        skip?: number;
    } = {}): Promise<IAnalyticsEvent[]> {
        try {
            const query: Record<string, unknown> = {};

            if (filters.eventType) query.event = filters.eventType;
            if (filters.userId) query.userId = filters.userId;
            if (filters.sessionId) query.sessionId = filters.sessionId;

            if (filters.startDate || filters.endDate) {
                query.timestamp = {};
                if (filters.startDate) (query.timestamp as Record<string, Date>).$gte = filters.startDate;
                if (filters.endDate) (query.timestamp as Record<string, Date>).$lte = filters.endDate;
            }

            return await AnalyticsEvent.find(query)
                .sort({ timestamp: -1 })
                .limit(filters.limit || 100)
                .skip(filters.skip || 0);
        } catch (error) {
            console.error('Error getting analytics events:', error);
            throw error;
        }
    }

    // Get total conversation count (unique sessions with chat_api_request)
    public async getConversationCount(startDate?: Date, endDate?: Date): Promise<number> {
        try {
            const matchStage: Record<string, unknown> = { event: 'chat_api_request' };
            if (startDate || endDate) {
                matchStage.timestamp = {};
                if (startDate) (matchStage.timestamp as Record<string, Date>).$gte = startDate;
                if (endDate) (matchStage.timestamp as Record<string, Date>).$lte = endDate;
            }

            const result = await AnalyticsEvent.aggregate([
                { $match: matchStage },
                { $group: { _id: '$sessionId' } },
                { $count: 'total' }
            ]);

            return result[0]?.total || 0;
        } catch (error) {
            console.error('Error getting conversation count:', error);
            throw error;
        }
    }

    // Get conversion rate (add_to_cart / product_recommended * 100)
    public async getConversionRate(startDate?: Date, endDate?: Date): Promise<number> {
        try {
            const matchStage: Record<string, unknown> = {};
            if (startDate || endDate) {
                matchStage.timestamp = {};
                if (startDate) (matchStage.timestamp as Record<string, Date>).$gte = startDate;
                if (endDate) (matchStage.timestamp as Record<string, Date>).$lte = endDate;
            }

            const [recommendedCount, cartCount] = await Promise.all([
                AnalyticsEvent.countDocuments({ ...matchStage, event: 'product_recommended' }),
                AnalyticsEvent.countDocuments({ ...matchStage, event: 'add_to_cart' })
            ]);

            if (recommendedCount === 0) return 0;
            return Math.round((cartCount / recommendedCount) * 100 * 100) / 100; // 2 decimal places
        } catch (error) {
            console.error('Error getting conversion rate:', error);
            throw error;
        }
    }

    // Get revenue stats from add_to_cart events
    public async getRevenueStats(startDate?: Date, endDate?: Date): Promise<{
        totalRevenue: number;
        averageOrderValue: number;
        totalCartAdditions: number;
    }> {
        try {
            const matchStage: Record<string, unknown> = { event: 'add_to_cart' };
            if (startDate || endDate) {
                matchStage.timestamp = {};
                if (startDate) (matchStage.timestamp as Record<string, Date>).$gte = startDate;
                if (endDate) (matchStage.timestamp as Record<string, Date>).$lte = endDate;
            }

            const result = await AnalyticsEvent.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $ifNull: ['$properties.value', 0] } },
                        totalCartAdditions: { $sum: 1 },
                        uniqueSessions: { $addToSet: '$sessionId' }
                    }
                },
                {
                    $project: {
                        totalRevenue: 1,
                        totalCartAdditions: 1,
                        uniqueSessionCount: { $size: '$uniqueSessions' }
                    }
                }
            ]);

            if (!result[0]) {
                return { totalRevenue: 0, averageOrderValue: 0, totalCartAdditions: 0 };
            }

            const { totalRevenue, totalCartAdditions, uniqueSessionCount } = result[0];
            const averageOrderValue = uniqueSessionCount > 0 ? Math.round((totalRevenue / uniqueSessionCount) * 100) / 100 : 0;

            return {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                averageOrderValue,
                totalCartAdditions
            };
        } catch (error) {
            console.error('Error getting revenue stats:', error);
            throw error;
        }
    }

    // Get top products (by recommendation and cart additions)
    public async getTopProducts(startDate?: Date, endDate?: Date, limit: number = 10): Promise<Array<{
        productName: string;
        recommendations: number;
        cartAdditions: number;
    }>> {
        try {
            const matchStage: Record<string, unknown> = {
                event: { $in: ['product_recommended', 'add_to_cart'] }
            };
            if (startDate || endDate) {
                matchStage.timestamp = {};
                if (startDate) (matchStage.timestamp as Record<string, Date>).$gte = startDate;
                if (endDate) (matchStage.timestamp as Record<string, Date>).$lte = endDate;
            }

            const result = await AnalyticsEvent.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$properties.product_name',
                        recommendations: {
                            $sum: { $cond: [{ $eq: ['$event', 'product_recommended'] }, 1, 0] }
                        },
                        cartAdditions: {
                            $sum: { $cond: [{ $eq: ['$event', 'add_to_cart'] }, 1, 0] }
                        }
                    }
                },
                { $match: { _id: { $ne: null } } },
                { $sort: { cartAdditions: -1, recommendations: -1 } },
                { $limit: limit },
                {
                    $project: {
                        productName: '$_id',
                        recommendations: 1,
                        cartAdditions: 1,
                        _id: 0
                    }
                }
            ]);

            return result;
        } catch (error) {
            console.error('Error getting top products:', error);
            throw error;
        }
    }

    // Get events by day for charting
    public async getEventsByDay(startDate?: Date, endDate?: Date, eventTypes?: string[]): Promise<Array<{
        date: string;
        events: Record<string, number>;
        total: number;
    }>> {
        try {
            const matchStage: Record<string, unknown> = {};
            if (eventTypes && eventTypes.length > 0) {
                matchStage.event = { $in: eventTypes };
            }
            if (startDate || endDate) {
                matchStage.timestamp = {};
                if (startDate) (matchStage.timestamp as Record<string, Date>).$gte = startDate;
                if (endDate) (matchStage.timestamp as Record<string, Date>).$lte = endDate;
            }

            const result = await AnalyticsEvent.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                            event: '$event'
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: '$_id.date',
                        events: {
                            $push: { k: '$_id.event', v: '$count' }
                        },
                        total: { $sum: '$count' }
                    }
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        date: '$_id',
                        events: { $arrayToObject: '$events' },
                        total: 1,
                        _id: 0
                    }
                }
            ]);

            return result;
        } catch (error) {
            console.error('Error getting events by day:', error);
            throw error;
        }
    }

    // Get event type breakdown (for pie chart)
    public async getEventTypeBreakdown(startDate?: Date, endDate?: Date): Promise<Array<{
        eventType: string;
        count: number;
        percentage: number;
    }>> {
        try {
            const matchStage: Record<string, unknown> = {};
            if (startDate || endDate) {
                matchStage.timestamp = {};
                if (startDate) (matchStage.timestamp as Record<string, Date>).$gte = startDate;
                if (endDate) (matchStage.timestamp as Record<string, Date>).$lte = endDate;
            }

            const result = await AnalyticsEvent.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: '$event',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            const total = result.reduce((sum, item) => sum + item.count, 0);
            return result.map(item => ({
                eventType: item._id,
                count: item.count,
                percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
            }));
        } catch (error) {
            console.error('Error getting event type breakdown:', error);
            throw error;
        }
    }

    // Get today vs yesterday comparison
    public async getTodayVsYesterday(): Promise<{
        today: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        yesterday: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        changes: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
    }> {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);

            const getMetrics = async (start: Date, end: Date) => {
                const [conversations, recommendations, cartData] = await Promise.all([
                    AnalyticsEvent.countDocuments({ event: 'chat_api_request', timestamp: { $gte: start, $lt: end } }),
                    AnalyticsEvent.countDocuments({ event: 'product_recommended', timestamp: { $gte: start, $lt: end } }),
                    AnalyticsEvent.aggregate([
                        { $match: { event: 'add_to_cart', timestamp: { $gte: start, $lt: end } } },
                        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$properties.value', 0] } } } }
                    ])
                ]);
                return {
                    conversations,
                    recommendations,
                    cartAdditions: cartData[0]?.count || 0,
                    revenue: Math.round((cartData[0]?.revenue || 0) * 100) / 100
                };
            };

            const today = await getMetrics(todayStart, now);
            const yesterday = await getMetrics(yesterdayStart, todayStart);

            const calcChange = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            return {
                today,
                yesterday,
                changes: {
                    conversations: calcChange(today.conversations, yesterday.conversations),
                    recommendations: calcChange(today.recommendations, yesterday.recommendations),
                    cartAdditions: calcChange(today.cartAdditions, yesterday.cartAdditions),
                    revenue: calcChange(today.revenue, yesterday.revenue)
                }
            };
        } catch (error) {
            console.error('Error getting today vs yesterday:', error);
            throw error;
        }
    }

    // Get hourly activity for today
    public async getHourlyActivity(): Promise<Array<{
        hour: number;
        events: number;
    }>> {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const result = await AnalyticsEvent.aggregate([
                { $match: { timestamp: { $gte: todayStart } } },
                {
                    $group: {
                        _id: { $hour: '$timestamp' },
                        events: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Fill in missing hours with 0
            const hourlyData: Array<{ hour: number; events: number }> = [];
            const currentHour = now.getHours();
            for (let h = 0; h <= currentHour; h++) {
                const found = result.find(r => r._id === h);
                hourlyData.push({ hour: h, events: found?.events || 0 });
            }

            return hourlyData;
        } catch (error) {
            console.error('Error getting hourly activity:', error);
            throw error;
        }
    }

    // Get all stats in one call (for dashboard)
    public async getDashboardStats(startDate?: Date, endDate?: Date): Promise<{
        totalConversations: number;
        conversionRate: number;
        totalRevenue: number;
        averageOrderValue: number;
        totalCartAdditions: number;
        topProducts: Array<{ productName: string; recommendations: number; cartAdditions: number }>;
        eventsByDay: Array<{ date: string; events: Record<string, number>; total: number }>;
        eventTypeBreakdown: Array<{ eventType: string; count: number; percentage: number }>;
        todayVsYesterday: {
            today: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
            yesterday: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
            changes: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        };
        hourlyActivity: Array<{ hour: number; events: number }>;
    }> {
        const [conversationCount, conversionRate, revenueStats, topProducts, eventsByDay, eventTypeBreakdown, todayVsYesterday, hourlyActivity] = await Promise.all([
            this.getConversationCount(startDate, endDate),
            this.getConversionRate(startDate, endDate),
            this.getRevenueStats(startDate, endDate),
            this.getTopProducts(startDate, endDate),
            this.getEventsByDay(startDate, endDate, ['chat_api_request', 'product_recommended', 'add_to_cart', 'plan_generated']),
            this.getEventTypeBreakdown(startDate, endDate),
            this.getTodayVsYesterday(),
            this.getHourlyActivity()
        ]);

        return {
            totalConversations: conversationCount,
            conversionRate,
            ...revenueStats,
            topProducts,
            eventsByDay,
            eventTypeBreakdown,
            todayVsYesterday,
            hourlyActivity
        };
    }
}

// Export singleton instance
export const analyticsEventService = AnalyticsEventService.getInstance();

