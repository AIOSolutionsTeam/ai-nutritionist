import { getDb, COLLECTIONS } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';

// AnalyticsEvent interface
export interface IAnalyticsEvent {
    id?: string;
    event: string;
    properties: Record<string, unknown>;
    userId?: string;
    sessionId: string;
    timestamp: Date;
    createdAt: Date;
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
            const db = getDb();
            const now = new Date();

            const docData = {
                event: eventData.event,
                properties: eventData.properties || {},
                userId: eventData.userId || null,
                sessionId: eventData.sessionId,
                timestamp: Timestamp.fromDate(eventData.timestamp || now),
                createdAt: Timestamp.fromDate(now),
            };

            const docRef = await db.collection(COLLECTIONS.ANALYTICS_EVENTS).add(docData);
            const savedDoc = await docRef.get();

            return {
                id: savedDoc.id,
                ...convertTimestamps(savedDoc.data() as Omit<IAnalyticsEvent, 'id'>),
            };
        } catch (error) {
            console.error('Error creating analytics event:', error);
            throw error;
        }
    }

    // Get events with filters
    public async getEvents(
        filters: {
            eventType?: string;
            userId?: string;
            sessionId?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            skip?: number;
        } = {}
    ): Promise<IAnalyticsEvent[]> {
        try {
            const db = getDb();
            let query = db.collection(COLLECTIONS.ANALYTICS_EVENTS).orderBy('timestamp', 'desc');

            if (filters.eventType) {
                query = query.where('event', '==', filters.eventType);
            }
            if (filters.userId) {
                query = query.where('userId', '==', filters.userId);
            }
            if (filters.sessionId) {
                query = query.where('sessionId', '==', filters.sessionId);
            }
            if (filters.startDate) {
                query = query.where('timestamp', '>=', Timestamp.fromDate(filters.startDate));
            }
            if (filters.endDate) {
                query = query.where('timestamp', '<=', Timestamp.fromDate(filters.endDate));
            }

            query = query.limit(filters.limit || 100);
            if (filters.skip) {
                query = query.offset(filters.skip);
            }

            const snapshot = await query.get();

            return snapshot.docs.map((doc) => ({
                id: doc.id,
                ...convertTimestamps(doc.data() as Omit<IAnalyticsEvent, 'id'>),
            }));
        } catch (error) {
            console.error('Error getting analytics events:', error);
            throw error;
        }
    }

    // Helper to get all events in a date range (for in-memory aggregation)
    private async getEventsInRange(startDate?: Date, endDate?: Date): Promise<IAnalyticsEvent[]> {
        const db = getDb();
        let query = db.collection(COLLECTIONS.ANALYTICS_EVENTS).orderBy('timestamp', 'desc');

        if (startDate) {
            query = query.where('timestamp', '>=', Timestamp.fromDate(startDate));
        }
        if (endDate) {
            query = query.where('timestamp', '<=', Timestamp.fromDate(endDate));
        }

        const snapshot = await query.get();
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...convertTimestamps(doc.data() as Omit<IAnalyticsEvent, 'id'>),
        }));
    }

    // Get total conversation count (unique sessions with chat_api_request)
    public async getConversationCount(startDate?: Date, endDate?: Date): Promise<number> {
        try {
            const events = await this.getEventsInRange(startDate, endDate);
            const sessionsWithChat = new Set(
                events.filter((e) => e.event === 'chat_api_request').map((e) => e.sessionId)
            );
            return sessionsWithChat.size;
        } catch (error) {
            console.error('Error getting conversation count:', error);
            throw error;
        }
    }

    // Get conversion rate (add_to_cart / product_recommended * 100)
    public async getConversionRate(startDate?: Date, endDate?: Date): Promise<number> {
        try {
            const events = await this.getEventsInRange(startDate, endDate);
            const recommendedCount = events.filter((e) => e.event === 'product_recommended').length;
            const cartCount = events.filter((e) => e.event === 'add_to_cart').length;

            if (recommendedCount === 0) return 0;
            return Math.round((cartCount / recommendedCount) * 100 * 100) / 100;
        } catch (error) {
            console.error('Error getting conversion rate:', error);
            throw error;
        }
    }

    // Get revenue stats from add_to_cart events
    public async getRevenueStats(
        startDate?: Date,
        endDate?: Date
    ): Promise<{ totalRevenue: number; averageOrderValue: number; totalCartAdditions: number }> {
        try {
            const events = await this.getEventsInRange(startDate, endDate);
            const cartEvents = events.filter((e) => e.event === 'add_to_cart');

            const totalRevenue = cartEvents.reduce((sum, e) => {
                const value = (e.properties?.value as number) || 0;
                return sum + value;
            }, 0);

            const uniqueSessions = new Set(cartEvents.map((e) => e.sessionId));
            const averageOrderValue = uniqueSessions.size > 0 ? Math.round((totalRevenue / uniqueSessions.size) * 100) / 100 : 0;

            return {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                averageOrderValue,
                totalCartAdditions: cartEvents.length,
            };
        } catch (error) {
            console.error('Error getting revenue stats:', error);
            throw error;
        }
    }

    // Get verified revenue stats from purchase_verified events (actual Shopify purchases)
    public async getVerifiedRevenueStats(
        startDate?: Date,
        endDate?: Date
    ): Promise<{ verifiedRevenue: number; verifiedAverageOrderValue: number; totalPurchases: number }> {
        try {
            const events = await this.getEventsInRange(startDate, endDate);
            const purchaseEvents = events.filter((e) => e.event === 'purchase_verified');

            const verifiedRevenue = purchaseEvents.reduce((sum, e) => {
                const value = (e.properties?.total_value as number) || 0;
                return sum + value;
            }, 0);

            const uniqueSessions = new Set(purchaseEvents.map((e) => e.sessionId));
            const verifiedAverageOrderValue = uniqueSessions.size > 0
                ? Math.round((verifiedRevenue / uniqueSessions.size) * 100) / 100
                : 0;

            return {
                verifiedRevenue: Math.round(verifiedRevenue * 100) / 100,
                verifiedAverageOrderValue,
                totalPurchases: purchaseEvents.length,
            };
        } catch (error) {
            console.error('Error getting verified revenue stats:', error);
            throw error;
        }
    }

    // Get top products (by recommendation, cart additions, and purchases)
    public async getTopProducts(
        startDate?: Date,
        endDate?: Date,
        limit: number = 10
    ): Promise<Array<{ productName: string; recommendations: number; cartAdditions: number; purchases: number }>> {
        try {
            const events = await this.getEventsInRange(startDate, endDate);
            const relevantEvents = events.filter((e) =>
                e.event === 'product_recommended' ||
                e.event === 'add_to_cart' ||
                e.event === 'purchase_verified'
            );

            const productStats = new Map<string, { recommendations: number; cartAdditions: number; purchases: number }>();

            for (const event of relevantEvents) {
                const productName = event.properties?.product_name as string;
                if (!productName) continue;

                const current = productStats.get(productName) || { recommendations: 0, cartAdditions: 0, purchases: 0 };
                if (event.event === 'product_recommended') {
                    current.recommendations++;
                } else if (event.event === 'add_to_cart') {
                    current.cartAdditions++;
                } else if (event.event === 'purchase_verified') {
                    // Check if quantity is available, otherwise default to 1
                    const quantity = (event.properties.quantity as number) || 1;
                    current.purchases += quantity;
                }
                productStats.set(productName, current);
            }

            return Array.from(productStats.entries())
                .map(([productName, stats]) => ({ productName, ...stats }))
                .sort((a, b) => b.purchases - a.purchases || b.cartAdditions - a.cartAdditions || b.recommendations - a.recommendations)
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting top products:', error);
            throw error;
        }
    }

    // Get events by day for charting
    public async getEventsByDay(
        startDate?: Date,
        endDate?: Date,
        eventTypes?: string[]
    ): Promise<Array<{ date: string; events: Record<string, number>; total: number }>> {
        try {
            let events = await this.getEventsInRange(startDate, endDate);

            if (eventTypes && eventTypes.length > 0) {
                events = events.filter((e) => eventTypes.includes(e.event));
            }

            const dayStats = new Map<string, { events: Record<string, number>; total: number }>();

            for (const event of events) {
                const dateKey = event.timestamp.toISOString().split('T')[0];
                const current = dayStats.get(dateKey) || { events: {}, total: 0 };

                current.events[event.event] = (current.events[event.event] || 0) + 1;
                current.total++;
                dayStats.set(dateKey, current);
            }

            return Array.from(dayStats.entries())
                .map(([date, stats]) => ({ date, ...stats }))
                .sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error('Error getting events by day:', error);
            throw error;
        }
    }

    // Get event type breakdown (for pie chart)
    public async getEventTypeBreakdown(
        startDate?: Date,
        endDate?: Date
    ): Promise<Array<{ eventType: string; count: number; percentage: number }>> {
        try {
            const events = await this.getEventsInRange(startDate, endDate);
            const typeCounts = new Map<string, number>();

            for (const event of events) {
                typeCounts.set(event.event, (typeCounts.get(event.event) || 0) + 1);
            }

            const total = events.length;
            return Array.from(typeCounts.entries())
                .map(([eventType, count]) => ({
                    eventType,
                    count,
                    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
                }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('Error getting event type breakdown:', error);
            throw error;
        }
    }

    // Get period comparison
    public async getPeriodComparison(
        currentStart?: Date,
        currentEnd?: Date,
        prevStart?: Date,
        prevEnd?: Date
    ): Promise<{
        current: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        previous: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        changes: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
    }> {
        try {
            // Default to Today vs Yesterday if dates not provided
            const now = new Date();
            const defaultCurrentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const defaultCurrentEnd = now;

            const defaultPrevStart = new Date(defaultCurrentStart);
            defaultPrevStart.setDate(defaultPrevStart.getDate() - 1);
            const defaultPrevEnd = new Date(defaultPrevStart);
            defaultPrevEnd.setHours(23, 59, 59, 999); // Use full day for yesterday if comparing to partial today? 
            // Actually, for fair comparison "Today vs Yesterday", we usually compare "Today so far" vs "Yesterday same time" OR "Yesterday full".
            // The original code did: yesterdayStart (00:00) to todayStart (00:00). So it compared full yesterday vs today so far?
            // Original code:
            // todayStart = 00:00 today. End = now.
            // yesterdayStart = 00:00 yesterday. End = todayStart (00:00 today). 
            // So default was Yesterday Full Day vs Today Partial Day. 
            // Let's keep that default logic if not specified.

            const cStart = currentStart || defaultCurrentStart;
            const cEnd = currentEnd || defaultCurrentEnd;
            const pStart = prevStart || defaultPrevStart;
            // For default yesterday, original was 'todayStart' which is 00:00 today.
            const pEnd = prevEnd || (currentStart ? new Date(currentStart) : defaultCurrentStart);

            const getMetrics = async (start: Date, end: Date) => {
                const events = await this.getEventsInRange(start, end);

                const conversations = events.filter((e) => e.event === 'chat_api_request').length;
                const recommendations = events.filter((e) => e.event === 'product_recommended').length;
                const cartEvents = events.filter((e) => e.event === 'add_to_cart');
                const cartAdditions = cartEvents.length;
                const revenue = cartEvents.reduce((sum, e) => sum + ((e.properties?.value as number) || 0), 0);

                return {
                    conversations,
                    recommendations,
                    cartAdditions,
                    revenue: Math.round(revenue * 100) / 100,
                };
            };

            const current = await getMetrics(cStart, cEnd);
            const previous = await getMetrics(pStart, pEnd);

            const calcChange = (cur: number, prev: number) => {
                if (prev === 0) return cur > 0 ? 100 : 0;
                return Math.round(((cur - prev) / prev) * 100);
            };

            return {
                current,
                previous,
                changes: {
                    conversations: calcChange(current.conversations, previous.conversations),
                    recommendations: calcChange(current.recommendations, previous.recommendations),
                    cartAdditions: calcChange(current.cartAdditions, previous.cartAdditions),
                    revenue: calcChange(current.revenue, previous.revenue),
                },
            };
        } catch (error) {
            console.error('Error getting period comparison:', error);
            throw error;
        }
    }

    // Get hourly activity for today
    public async getHourlyActivity(): Promise<Array<{ hour: number; events: number }>> {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const events = await this.getEventsInRange(todayStart, now);
            const hourlyStats = new Map<number, number>();

            for (const event of events) {
                const hour = event.timestamp.getHours();
                hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1);
            }

            // Fill in all hours up to current hour
            const currentHour = now.getHours();
            const result: Array<{ hour: number; events: number }> = [];
            for (let h = 0; h <= currentHour; h++) {
                result.push({ hour: h, events: hourlyStats.get(h) || 0 });
            }

            return result;
        } catch (error) {
            console.error('Error getting hourly activity:', error);
            throw error;
        }
    }

    // Get all stats in one call (for dashboard)
    public async getDashboardStats(
        startDate?: Date,
        endDate?: Date,
        // Optional comparison params
        compareProposedStartDate?: Date,
        compareProposedEndDate?: Date,
        comparePreviousStartDate?: Date,
        comparePreviousEndDate?: Date
    ): Promise<{
        totalConversations: number;
        conversionRate: number;
        totalRevenue: number;
        averageOrderValue: number;
        totalCartAdditions: number;
        verifiedRevenue: number;
        verifiedAverageOrderValue: number;
        totalPurchases: number;
        topProducts: Array<{ productName: string; recommendations: number; cartAdditions: number }>;
        eventsByDay: Array<{ date: string; events: Record<string, number>; total: number }>;
        eventTypeBreakdown: Array<{ eventType: string; count: number; percentage: number }>;
        periodComparison: {
            current: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
            previous: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
            changes: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        };
        hourlyActivity: Array<{ hour: number; events: number }>;
    }> {
        const [conversationCount, conversionRate, revenueStats, verifiedRevenueStats, topProducts, eventsByDay, eventTypeBreakdown, periodComparison, hourlyActivity] =
            await Promise.all([
                this.getConversationCount(startDate, endDate),
                this.getConversionRate(startDate, endDate),
                this.getRevenueStats(startDate, endDate),
                this.getVerifiedRevenueStats(startDate, endDate),
                this.getTopProducts(startDate, endDate),
                this.getEventsByDay(startDate, endDate, ['chat_api_request', 'product_recommended', 'add_to_cart', 'plan_generated', 'purchase_verified']),
                this.getEventTypeBreakdown(startDate, endDate),
                this.getPeriodComparison(compareProposedStartDate, compareProposedEndDate, comparePreviousStartDate, comparePreviousEndDate),
                this.getHourlyActivity(),
            ]);

        return {
            totalConversations: conversationCount,
            conversionRate,
            ...revenueStats,
            ...verifiedRevenueStats,
            topProducts,
            eventsByDay,
            eventTypeBreakdown,
            periodComparison,
            hourlyActivity,
        };
    }

    // Get sales chart data
    public async getSalesChartData(
        granularity: 'week' | 'month' | 'year' = 'week'
    ): Promise<Array<{ label: string; count: number; revenue: number; date?: string; sortKey: number }>> {
        try {
            const now = new Date();
            let startDate: Date;
            let endDate: Date = now;

            // Determine date range based on granularity
            if (granularity === 'week') {
                // current week: Monday to Sunday
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                startDate = new Date(now.setDate(diff));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(); // up to now
            } else if (granularity === 'month') {
                // current month: 1st to 31st
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else { // year
                // current year: Jan to Dec
                startDate = new Date(now.getFullYear(), 0, 1);
            }

            const events = await this.getEventsInRange(startDate, endDate);
            const purchaseEvents = events.filter((e) => e.event === 'purchase_verified');

            // Initialize buckets with both count and revenue
            const dataMap = new Map<string, { count: number; revenue: number; sortKey: number; date?: string }>();

            if (granularity === 'week') {
                // Initialize Mon-Sun
                const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
                days.forEach((day, index) => {
                    dataMap.set(day, { count: 0, revenue: 0, sortKey: index });
                });

                purchaseEvents.forEach(event => {
                    const dayIndex = (event.timestamp.getDay() + 6) % 7; // Mon=0, Sun=6
                    const dayName = days[dayIndex];
                    if (dataMap.has(dayName)) {
                        const current = dataMap.get(dayName)!;
                        current.count += 1;
                        current.revenue += (event.properties?.total_value as number) || 0;
                    }
                });

            } else if (granularity === 'month') {
                // Initialize all days in month
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                for (let i = 1; i <= daysInMonth; i++) {
                    const dateObj = new Date(now.getFullYear(), now.getMonth(), i);
                    const label = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); // 01/12
                    dataMap.set(label, { count: 0, revenue: 0, sortKey: i, date: dateObj.toISOString() });
                }

                purchaseEvents.forEach(event => {
                    const label = event.timestamp.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                    if (dataMap.has(label)) {
                        const current = dataMap.get(label)!;
                        current.count += 1;
                        current.revenue += (event.properties?.total_value as number) || 0;
                    }
                });

            } else { // year
                // Initialize Jan-Dec
                const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                months.forEach((month, index) => {
                    dataMap.set(month, { count: 0, revenue: 0, sortKey: index });
                });

                purchaseEvents.forEach(event => {
                    const monthIndex = event.timestamp.getMonth();
                    const monthName = months[monthIndex];
                    if (dataMap.has(monthName)) {
                        const current = dataMap.get(monthName)!;
                        current.count += 1;
                        current.revenue += (event.properties?.total_value as number) || 0;
                    }
                });
            }

            return Array.from(dataMap.entries())
                .map(([label, data]) => ({ label, ...data }))
                .sort((a, b) => a.sortKey - b.sortKey);

        } catch (error) {
            console.error('Error getting sales chart data:', error);
            throw error;
        }

    }

}

// Export singleton instance
export const analyticsEventService = AnalyticsEventService.getInstance();
