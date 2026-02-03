'use client';

import { useState, useEffect, useCallback } from 'react';
import './admin.css';

// Types
interface DashboardStats {
    totalConversations: number;
    conversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalCartAdditions: number;
    verifiedRevenue: number;
    verifiedAverageOrderValue: number;
    totalPurchases: number;
    topProducts: Array<{ productName: string; recommendations: number; cartAdditions: number; purchases: number }>;
    eventsByDay: Array<{ date: string; events: Record<string, number>; total: number }>;
    eventTypeBreakdown: Array<{ eventType: string; count: number; percentage: number }>;
    periodComparison: {
        current: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        previous: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        changes: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
    };
    hourlyActivity: Array<{ hour: number; events: number }>;
}

interface AnalyticsEvent {
    id: string;
    event: string;
    properties: Record<string, unknown>;
    userId?: string;
    sessionId: string;
    timestamp: string;
}

interface UsageStats {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
    byRequestType: Record<string, { requests: number; tokens: number; cost: number }>;
    todayVsYesterday: {
        today: { requests: number; tokens: number; cost: number };
        yesterday: { requests: number; tokens: number; cost: number };
        change: { requests: number; tokens: number; cost: number };
    };
}

interface SalesChartData {
    label: string;
    count: number;
    revenue: number;
    date?: string;
    sortKey: number;
}

// Loading Skeleton Component
function DashboardSkeleton() {
    return (
        <div className="admin-container">
            <div className="dashboard">
                <div className="dashboard-header">
                    <div className="skeleton skeleton-title" style={{ width: '300px' }}></div>
                    <div className="skeleton" style={{ width: '100px', height: '40px', borderRadius: '8px' }}></div>
                </div>

                {/* KPI Grid */}
                <div className="kpi-grid skeleton-grid-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton skeleton-card">
                            <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                            <div className="skeleton skeleton-title" style={{ width: '40%', height: '32px', marginBottom: '8px' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '30%' }}></div>
                        </div>
                    ))}
                </div>

                {/* Usage Section */}
                <div style={{ marginBottom: '32px' }}>
                    <div className="skeleton skeleton-title" style={{ width: '200px' }}></div>
                    <div className="usage-grid">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton skeleton-card" style={{ height: '80px', padding: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: '4px' }}></div>
                                        <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                    <div className="chart-card skeleton-chart"></div>
                    <div className="chart-card skeleton-chart"></div>
                </div>

                <div className="chart-card skeleton-chart" style={{ marginTop: '24px' }}></div>

                {/* Recent Events */}
                <div style={{ marginTop: '32px' }}>
                    <div className="skeleton skeleton-title" style={{ width: '250px' }}></div>
                    <div className="events-table-container">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="skeleton skeleton-table-row"></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isComparisonLoading, setIsComparisonLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [eventFilter, setEventFilter] = useState('all');
    const [eventsPage, setEventsPage] = useState(1);
    const [comparisonRange, setComparisonRange] = useState('today');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([]);
    const [salesChartGranularity, setSalesChartGranularity] = useState<'week' | 'month' | 'year'>('week');
    const [salesChartMetric, setSalesChartMetric] = useState<'count' | 'revenue'>('count');
    const [isSalesChartLoading, setIsSalesChartLoading] = useState(false);
    const [configError, setConfigError] = useState<{ message: string; code?: string } | null>(null);
    const EVENTS_PER_PAGE = 10;

    // Check auth status on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/admin/auth');
            const data = await res.json();
            setIsAuthenticated(data.authenticated);
            if (data.authenticated) {
                loadDashboardData();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                setIsAuthenticated(true);
                setPassword('');
                loadDashboardData();
            } else {
                setLoginError('Invalid password');
            }
        } catch (error) {
            console.error('Login failed:', error);
            setLoginError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/auth', { method: 'DELETE' });
            setIsAuthenticated(false);
            setStats(null);
            setEvents([]);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const getComparisonDates = useCallback(() => {
        const now = new Date();
        // Reset time to end of day for consistency in "end" dates if needed, or keep as "now"
        // keeping "now" for current period end makes sense for real-time dashboard.

        let cStartDate = new Date();
        let cEndDate = new Date();
        let pStartDate = new Date();
        let pEndDate = new Date();

        switch (comparisonRange) {
            case 'week': // This Week vs Last Week
                // Start of this week (Monday)
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                cStartDate = new Date(now.setDate(diff));
                cStartDate.setHours(0, 0, 0, 0);
                cEndDate = new Date(); // Now

                // Last week
                pStartDate = new Date(cStartDate);
                pStartDate.setDate(pStartDate.getDate() - 7);
                pEndDate = new Date(cStartDate); // End of last week is start of this week (or -1ms)
                break;

            case 'month': // This Month vs Last Month
                cStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                cEndDate = new Date();

                pStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                pEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); // Last day of prev month
                break;

            case '7d': // Last 7 Days vs Previous 7 Days
                cEndDate = new Date();
                cStartDate = new Date();
                cStartDate.setDate(cEndDate.getDate() - 7);

                pEndDate = new Date(cStartDate);
                pStartDate = new Date(pEndDate);
                pStartDate.setDate(pEndDate.getDate() - 7);
                break;

            case '30d': // Last 30 Days vs Previous 30 Days
                cEndDate = new Date();
                cStartDate = new Date();
                cStartDate.setDate(cEndDate.getDate() - 30);

                pEndDate = new Date(cStartDate);
                pStartDate = new Date(pEndDate);
                pStartDate.setDate(pEndDate.getDate() - 30);
                break;

            case 'custom':
                if (customStartDate && customEndDate) {
                    cStartDate = new Date(customStartDate);
                    cEndDate = new Date(customEndDate);
                    cEndDate.setHours(23, 59, 59, 999); // Include full end day

                    const duration = cEndDate.getTime() - cStartDate.getTime();
                    pEndDate = new Date(cStartDate.getTime() - 1);
                    pStartDate = new Date(pEndDate.getTime() - duration);
                } else {
                    return null; // Incomplete custom selection
                }
                break;

            case 'today':
            default:
                cStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                cEndDate = new Date();

                pEndDate = new Date(cStartDate); // Start of today is end of yesterday (effectively)
                pStartDate = new Date(pEndDate);
                pStartDate.setDate(pStartDate.getDate() - 1);
                break;
        }

        return {
            compareStartDate: cStartDate.toISOString(),
            compareEndDate: cEndDate.toISOString(),
            prevStartDate: pStartDate.toISOString(),
            prevEndDate: pEndDate.toISOString()
        };
    }, [comparisonRange, customStartDate, customEndDate]);

    const loadComparisonData = useCallback(async () => {
        setIsComparisonLoading(true);
        try {
            const dateParams = getComparisonDates();
            const queryParams = new URLSearchParams();

            if (dateParams) {
                queryParams.append('compareStartDate', dateParams.compareStartDate);
                queryParams.append('compareEndDate', dateParams.compareEndDate);
                queryParams.append('prevStartDate', dateParams.prevStartDate);
                queryParams.append('prevEndDate', dateParams.prevEndDate);
            }

            const res = await fetch(`/api/admin/stats/comparison?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setStats(prev => prev ? { ...prev, periodComparison: data.data } : null);
                }
            }
        } catch (error) {
            console.error('Failed to load comparison data:', error);
        } finally {
            setIsComparisonLoading(false);
        }
    }, [getComparisonDates]);

    const loadSalesChartData = useCallback(async () => {
        setIsSalesChartLoading(true);
        try {
            const res = await fetch(`/api/admin/stats/sales-chart?granularity=${salesChartGranularity}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSalesChartData(data.data);
                }
            }
        } catch (error) {
            console.error('Failed to load sales chart data:', error);
        } finally {
            setIsSalesChartLoading(false);
        }
    }, [salesChartGranularity]);

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        setConfigError(null);
        try {
            // Initial load of all data
            const statsRes = await fetch('/api/admin/stats');

            if (statsRes.status === 503) {
                const errorData = await statsRes.json();
                if (errorData.code === 'FIREBASE_CONFIG_ERROR') {
                    setConfigError({
                        message: errorData.message,
                        code: errorData.code
                    });
                    setIsLoading(false);
                    return; // Stop loading other data
                }
            }

            // const [eventsRes, usageRes] = await Promise.all([
            //     fetch('/api/admin/events?limit=50'),
            //     fetch('/api/admin/usage')
            // ]);

            const usageRes = await fetch('/api/admin/usage');

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.data);
            }

            // if (eventsRes.ok) {
            //     const eventsData = await eventsRes.json();
            //     setEvents(eventsData.data || []);
            // }

            if (usageRes.ok) {
                const usageData = await usageRes.json();
                setUsageStats(usageData);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        if (isAuthenticated) {
            loadDashboardData();
        }
    }, [isAuthenticated, loadDashboardData]);

    // Reload comparison data when date range changes
    useEffect(() => {
        if (isAuthenticated) {
            if (comparisonRange !== 'custom' || (customStartDate && customEndDate)) {
                loadComparisonData();
            }
        }
    }, [comparisonRange, customStartDate, customEndDate, isAuthenticated, loadComparisonData]);

    // Load sales chart data when granularity changes
    useEffect(() => {
        if (isAuthenticated) {
            loadSalesChartData();
        }
    }, [isAuthenticated, loadSalesChartData]);

    // Filter events based on selection
    const filteredEvents = eventFilter === 'all'
        ? events
        : events.filter(e => e.event === eventFilter);

    // Pagination calculations
    const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
    const paginatedEvents = filteredEvents.slice(
        (eventsPage - 1) * EVENTS_PER_PAGE,
        eventsPage * EVENTS_PER_PAGE
    );

    // Get max values for chart scaling
    const maxProductValue = stats?.topProducts.length
        ? Math.max(...stats.topProducts.map(p => Math.max(p.recommendations, p.cartAdditions)))
        : 1;

    const maxDayValue = stats?.eventsByDay.length
        ? Math.max(...stats.eventsByDay.map(d => d.total))
        : 1;

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatShortDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    // Get event badge class
    const getEventBadgeClass = (eventName: string) => {
        const eventClasses: Record<string, string> = {
            'chat_opened': 'chat_opened',
            'chat_api_request': 'chat_opened',
            'chat_api_response': 'chat_opened',
            'product_recommended': 'product_recommended',
            'add_to_cart': 'add_to_cart',
            'plan_generated': 'plan_downloaded',
            'ai_response_generated': 'product_recommended',
            'ai_provider_error': 'default',
            'ai_fallback_success': 'product_recommended',
            'chat_api_error': 'default'
        };
        return eventClasses[eventName] || 'default';
    };

    // Loading state
    if (isLoading && !isAuthenticated) {
        return (
            <div className="admin-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    // Login page
    if (!isAuthenticated) {
        return (
            <div className="admin-container">
                <div className="login-page">
                    <form className="login-card" onSubmit={handleLogin}>
                        <h1 className="login-title">🔐 <span className="text-gradient">Tableau de Bord Admin</span></h1>
                        <p className="login-subtitle">Entrez votre mot de passe administrateur pour continuer</p>

                        {loginError && <div className="login-error">{loginError}</div>}

                        <input
                            type="password"
                            className="login-input"
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />

                        <button
                            type="submit"
                            className="login-button"
                            disabled={isLoading || !password}
                        >
                            {isLoading ? 'Connexion...' : 'Se Connecter'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Config Error View
    if (isAuthenticated && configError) {
        return (
            <div className="admin-container">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">⚠️ <span style={{ color: '#ef4444' }}>Erreur de Configuration</span></h1>
                    <button className="logout-button" onClick={handleLogout}>Déconnexion</button>
                </div>

                <div className="warning-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span className="warning-icon">🚫</span>
                    <p className="warning-text" style={{ color: '#fca5a5' }}>
                        <strong>Le serveur ne peut pas se connecter à Firebase.</strong>
                        <br /><br />
                        {configError.message}
                    </p>
                </div>

                <div style={{ marginTop: '24px', padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
                    <h3 style={{ color: 'white', marginBottom: '16px' }}>Comment réparer :</h3>
                    <ol style={{ marginLeft: '24px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <li>Allez dans votre console <strong>AWS Amplify</strong>.</li>
                        <li>Naviguez vers <strong>App settings &gt; Environment variables</strong>.</li>
                        <li>Assurez-vous que les variables suivantes sont définies :
                            <ul style={{ marginTop: '8px', marginLeft: '24px', fontFamily: 'monospace' }}>
                                <li>FIREBASE_PROJECT_ID</li>
                                <li>FIREBASE_CLIENT_EMAIL</li>
                                <li>FIREBASE_PRIVATE_KEY_BASE64 (Recommandé pour Amplify)</li>
                                <li>Ou FIREBASE_PRIVATE_KEY</li>
                            </ul>
                        </li>
                        <li>Après avoir ajouté les variables, <strong>redéployez</strong> votre application.</li>
                    </ol>
                </div>
            </div>
        );
    }

    // Show skeleton loading state while fetching initial data
    if (isAuthenticated && !stats) {
        return <DashboardSkeleton />;
    }

    // Dashboard
    return (
        <div className="admin-container">
            <div className="dashboard">
                {/* Header */}
                <div className="dashboard-header">
                    <h1 className="dashboard-title">📊 <span className="text-gradient">Tableau de Bord Analytique</span></h1>
                    <button className="logout-button" onClick={handleLogout}>
                        Déconnexion
                    </button>
                </div>

                {/* Revenue Warning Banner */}
                <div className="warning-banner">
                    <span className="warning-icon">⚠️</span>
                    <p className="warning-text">
                        <strong>Note :</strong> Le chiffre d&apos;affaires et le panier moyen sont calculés sur la base des <strong>ajouts au panier</strong>,
                        et non des achats confirmés. Le revenu réel peut différer car les commandes Shopify finalisées ne sont pas suivies.
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid">
                    <div className="kpi-card" data-tooltip="Nombre total de sessions de chat uniques où les utilisateurs ont interagi avec le nutritionniste IA. Chaque conversation représente une session complète d'un utilisateur.">
                        <div className="kpi-label">Conversations Totales</div>
                        <div className="kpi-value">{stats?.totalConversations ?? 0}</div>
                        <div className="kpi-subtext">Sessions de chat ouvertes</div>
                    </div>

                    <div className="kpi-card" data-tooltip="Pourcentage de produits recommandés par l'IA puis ajoutés au panier. Formule : (Produits ajoutés au panier ÷ Produits recommandés) × 100">
                        <div className="kpi-label">Taux de Conversion</div>
                        <div className="kpi-value">{stats?.conversionRate ?? 0}%</div>
                        <div className="kpi-subtext">Recommandé → Ajouté au panier</div>
                    </div>

                    <div className="kpi-card" data-tooltip="Valeur totale des produits ajoutés au panier via le chat IA. Note : Basé sur les ajouts au panier, PAS sur les commandes Shopify confirmées.">
                        <div className="kpi-label">CA Panier</div>
                        <div className="kpi-value revenue">€{stats?.totalRevenue?.toFixed(2) ?? '0.00'}</div>
                        <div className="kpi-subtext">{stats?.totalCartAdditions ?? 0} articles ajoutés au panier</div>
                    </div>

                    <div className="kpi-card" data-tooltip="Revenu réel des achats confirmés via Shopify webhook. Ce sont les produits recommandés par le chatbot qui ont été effectivement achetés.">
                        <div className="kpi-label">CA Vérifié ✓</div>
                        <div className="kpi-value" style={{ color: '#10b981' }}>€{stats?.verifiedRevenue?.toFixed(2) ?? '0.00'}</div>
                        <div className="kpi-subtext">{stats?.totalPurchases ?? 0} achats confirmés</div>
                    </div>

                    <div className="kpi-card" data-tooltip="Valeur moyenne du panier par session ayant au moins un produit ajouté. Formule : Chiffre d'affaires total ÷ Sessions avec activité panier">
                        <div className="kpi-label">Panier Moyen</div>
                        <div className="kpi-value revenue">€{stats?.averageOrderValue?.toFixed(2) ?? '0.00'}</div>
                        <div className="kpi-subtext">Par session avec activité panier</div>
                    </div>
                </div>

                {/* AI Usage & Costs */}
                <div className="usage-section">
                    <h3 className="section-title">🤖 Utilisation IA &amp; Coûts</h3>
                    <div className="usage-grid">
                        <div className="usage-card" data-tooltip="Nombre total d'appels API aux fournisseurs IA (OpenAI et Gemini). Inclut les messages chat et les générations de plans PDF.">
                            <div className="usage-icon">📊</div>
                            <div className="usage-content">
                                <span className="usage-value">{usageStats?.totalRequests ?? 0}</span>
                                <span className="usage-label">Requêtes Totales</span>
                            </div>
                        </div>
                        <div className="usage-card" data-tooltip="Les tokens sont les unités de base que les modèles IA utilisent pour traiter le texte.">
                            <div className="usage-icon">🔤</div>
                            <div className="usage-content">
                                <span className="usage-value">{((usageStats?.totalTokens ?? 0) / 1000).toFixed(1)}K</span>
                                <span className="usage-label">Tokens Totaux</span>
                            </div>
                        </div>
                        <div className="usage-card" data-tooltip="Coût total estimé selon les tarifs des fournisseurs. Gemini Flash : 0,075$/1M tokens entrée, 0,30$/1M sortie. GPT-4o-mini : 0,15$/1M entrée, 0,60$/1M sortie.">
                            <div className="usage-icon">💵</div>
                            <div className="usage-content">
                                <span className="usage-value cost">${usageStats?.totalCost?.toFixed(4) ?? '0.0000'}</span>
                                <span className="usage-label">Coût Total Est.</span>
                            </div>
                        </div>
                        <div className="usage-card" data-tooltip="Nombre de requêtes API IA effectuées aujourd'hui (depuis minuit). Le pourcentage montre l'évolution par rapport à hier.">
                            <div className="usage-icon">📈</div>
                            <div className="usage-content">
                                <span className="usage-value">{usageStats?.todayVsYesterday?.today?.requests ?? 0}</span>
                                <span className="usage-label">Requêtes du Jour</span>
                                {usageStats?.todayVsYesterday && (
                                    <span className={`usage-change ${usageStats.todayVsYesterday.change.requests >= 0 ? 'positive' : 'negative'}`}>
                                        {usageStats.todayVsYesterday.change.requests >= 0 ? '↑' : '↓'} {Math.abs(usageStats.todayVsYesterday.change.requests)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {usageStats?.byProvider && Object.keys(usageStats.byProvider).length > 0 && (
                        <div className="usage-providers">
                            <span className="providers-label">Par Fournisseur :</span>
                            {Object.entries(usageStats.byProvider).map(([provider, data]) => (
                                <span key={provider} className="provider-badge">
                                    {provider}: {data.requests} req (${data.cost.toFixed(4)})
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {/* Sales Chart Section */}
                <div className="chart-card" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 className="chart-title" style={{ margin: 0 }}>📈 Évolution des Ventes</h3>

                        {/* Metric Toggle - Center */}
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                            {(['count', 'revenue'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setSalesChartMetric(m)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: salesChartMetric === m ? '#3b82f6' : 'transparent',
                                        color: salesChartMetric === m ? 'white' : '#9ca3af',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {m === 'count' ? '📦 Produits' : '💰 CA (€)'}
                                </button>
                            ))}
                        </div>

                        {/* Granularity Toggle - Right */}
                        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                            {(['week', 'month', 'year'] as const).map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setSalesChartGranularity(g)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: salesChartGranularity === g ? '#10b981' : 'transparent',
                                        color: salesChartGranularity === g ? 'white' : '#9ca3af',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {g === 'week' ? 'Semaine' : g === 'month' ? 'Mois' : 'Année'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isSalesChartLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                        </div>
                    ) : salesChartData.length > 0 ? (() => {
                        // Calculate max value and label width dynamically
                        const values = salesChartData.map(d => salesChartMetric === 'count' ? d.count : d.revenue);
                        const maxValue = Math.max(...values, 10);
                        const niceMax = salesChartMetric === 'revenue'
                            ? Math.ceil(maxValue / 100) * 100
                            : Math.ceil(maxValue / 10) * 10;
                        const maxLabel = salesChartMetric === 'revenue' ? `€${niceMax}` : `${niceMax}`;
                        const labelWidth = Math.max(maxLabel.length * 8 + 5, 25); // ~8px per char + padding

                        return (
                            <div className="sales-chart-container" style={{ paddingLeft: `${labelWidth + 5}px` }}>
                                <div className={`sales-chart-wrapper ${salesChartGranularity}`}>
                                    {/* Grid Lines & Y-Axis */}
                                    <div className="sales-chart-grid-container">
                                        {[0, 1, 2, 3, 4].map((tick) => {
                                            const tickValue = Math.round((niceMax / 4) * tick);
                                            return (
                                                <div key={tick} className="grid-line" style={{ bottom: `${(tick / 4) * 100}%` }}>
                                                    <span
                                                        className="grid-label"
                                                        style={{
                                                            left: `-${labelWidth + 5}px`,
                                                            width: `${labelWidth}px`,
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {salesChartMetric === 'revenue' ? `€${tickValue}` : tickValue}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Bars */}
                                    <div className="sales-chart-bars">
                                        {salesChartData.map((item, index) => {
                                            const currentValue = salesChartMetric === 'count' ? item.count : item.revenue;
                                            const values = salesChartData.map(d => salesChartMetric === 'count' ? d.count : d.revenue);
                                            const maxValue = Math.max(...values, 10);
                                            const niceMax = salesChartMetric === 'revenue'
                                                ? Math.ceil(maxValue / 100) * 100
                                                : Math.ceil(maxValue / 10) * 10;
                                            const heightPercent = niceMax > 0 ? Math.max((currentValue / niceMax) * 100, 0) : 0;
                                            return (
                                                <div key={index} className="sales-bar-column">
                                                    <div
                                                        className="sales-bar"
                                                        style={{ height: `${heightPercent}%` }}
                                                        data-value={salesChartMetric === 'revenue' ? `€${currentValue.toFixed(2)}` : currentValue}
                                                    />
                                                    <span className="sales-label" title={item.label}>{item.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="no-data">
                            <div className="no-data-icon">📉</div>
                            <p>Pas de données de vente pour cette période</p>
                        </div>
                    )}
                </div>

                <div className="charts-grid">
                    {/* Comparison Section */}
                    <div className="chart-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                            <h3 className="chart-title" style={{ margin: 0 }}>
                                📊 {
                                    comparisonRange === 'today' ? "Aujourd'hui vs Hier" :
                                        comparisonRange === 'week' ? "Cette Semaine vs La Dernière" :
                                            comparisonRange === 'month' ? "Ce Mois vs Le Dernier" :
                                                comparisonRange === '7d' ? "7 Derniers Jours" :
                                                    comparisonRange === '30d' ? "30 Derniers Jours" :
                                                        "Période Personnalisée"
                                }
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {comparisonRange === 'custom' && (
                                    <>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="comparison-date-input"
                                        />
                                        <span style={{ color: '#9ca3af' }}>→</span>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="comparison-date-input"
                                        />
                                    </>
                                )}
                                <select
                                    value={comparisonRange}
                                    onChange={(e) => setComparisonRange(e.target.value)}
                                    className="comparison-select"
                                >
                                    <option value="today">Aujourd&apos;hui vs Hier</option>
                                    <option value="week">Cette Semaine vs Derniére</option>
                                    <option value="month">Ce Mois vs Dernier</option>
                                    <option value="7d">7 Derniers Jours</option>
                                    <option value="30d">30 Derniers Jours</option>
                                    <option value="custom">Personnalisé</option>
                                </select>
                            </div>
                        </div>

                        {/* Show loading overlay specifically for this card when updating logic */}
                        {isComparisonLoading ? (
                            <div className="loading-container" style={{ minHeight: '200px' }}>
                                <div className="loading-spinner"></div>
                            </div>
                        ) : stats?.periodComparison ? (
                            <div className="comparison-grid">
                                <div className="comparison-item">
                                    <div className="comparison-label">💬 Conversations</div>
                                    <div className="comparison-values">
                                        <span className="today-value">{stats.periodComparison.current.conversations}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">{stats.periodComparison.previous.conversations}</span>
                                    </div>
                                    <span className={`change-badge ${stats.periodComparison.changes.conversations >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.periodComparison.changes.conversations >= 0 ? '↑' : '↓'} {Math.abs(stats.periodComparison.changes.conversations)}%
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <div className="comparison-label">🎯 Recommandations</div>
                                    <div className="comparison-values">
                                        <span className="today-value">{stats.periodComparison.current.recommendations}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">{stats.periodComparison.previous.recommendations}</span>
                                    </div>
                                    <span className={`change-badge ${stats.periodComparison.changes.recommendations >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.periodComparison.changes.recommendations >= 0 ? '↑' : '↓'} {Math.abs(stats.periodComparison.changes.recommendations)}%
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <div className="comparison-label">🛒 Ajouts Panier</div>
                                    <div className="comparison-values">
                                        <span className="today-value">{stats.periodComparison.current.cartAdditions}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">{stats.periodComparison.previous.cartAdditions}</span>
                                    </div>
                                    <span className={`change-badge ${stats.periodComparison.changes.cartAdditions >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.periodComparison.changes.cartAdditions >= 0 ? '↑' : '↓'} {Math.abs(stats.periodComparison.changes.cartAdditions)}%
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <div className="comparison-label">💰 Revenus</div>
                                    <div className="comparison-values">
                                        <span className="today-value">€{stats.periodComparison.current.revenue}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">€{stats.periodComparison.previous.revenue}</span>
                                    </div>
                                    <span className={`change-badge ${stats.periodComparison.changes.revenue >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.periodComparison.changes.revenue >= 0 ? '↑' : '↓'} {Math.abs(stats.periodComparison.changes.revenue)}%
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="no-data">
                                <div className="no-data-icon">📭</div>
                                <p>Pas encore de données de comparaison</p>
                            </div>
                        )}
                    </div>

                    {/* Hourly Activity */}
                    <div className="chart-card">
                        <h3 className="chart-title">⏰ Activité Horaire du Jour</h3>
                        {isLoading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : stats?.hourlyActivity?.length ? (
                            <div className="radial-chart-container">
                                <div className="radial-chart">
                                    {/* Concentric circles for grid */}
                                    <div className="radial-grid">
                                        <div className="radial-circle" />
                                        <div className="radial-circle" />
                                        <div className="radial-circle" />
                                    </div>

                                    {/* Center label */}
                                    <div className="radial-center">
                                        <span className="radial-center-value">
                                            {stats.hourlyActivity.reduce((sum, h) => sum + h.events, 0)}
                                        </span>
                                        <span className="radial-center-label">Total</span>
                                    </div>

                                    {/* Bars radiating outward */}
                                    {stats.hourlyActivity.map((hour, index) => {
                                        const maxEvents = Math.max(...stats.hourlyActivity.map(h => h.events), 1);
                                        const barHeight = Math.max((hour.events / maxEvents) * 100, 10); // min 10%
                                        const angle = (index * 15) - 90; // 15 degrees per hour, start from top

                                        return (
                                            <div
                                                key={index}
                                                className="radial-bar-group"
                                                style={{ transform: `rotate(${angle}deg)` }}
                                                title={`${hour.hour}:00 - ${hour.events} événements`}
                                            >
                                                <div
                                                    className="radial-bar"
                                                    style={{ height: `${barHeight}%` }}
                                                />
                                                <span
                                                    className="radial-hour-label"
                                                    style={{ transform: `rotate(${-angle}deg)` }}
                                                >
                                                    {hour.hour}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="no-data">
                                <div className="no-data-icon">⏰</div>
                                <p>Pas encore d&apos;activité aujourd&apos;hui</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Charts Row 2: Top Products + Event Breakdown */}
                <div className="charts-grid charts-grid-products">
                    {/* Top Products */}
                    <div className="chart-card top-products-card">
                        <h3 className="chart-title">🏆 Performance des Produits</h3>
                        {isLoading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : stats?.topProducts.length ? (
                            <div className="top-products-table-wrapper">
                                <table className="top-products-table">
                                    <thead>
                                        <tr>
                                            <th>Produit</th>
                                            <th className="center">Recommandé</th>
                                            <th className="center">Ajouté au Panier</th>
                                            <th className="center">Achats</th>
                                            <th className="center">Conversion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.topProducts.slice(0, 8).map((product, index) => {
                                            const conversionRate = product.recommendations > 0
                                                ? Math.round((product.cartAdditions / product.recommendations) * 100)
                                                : 0;
                                            return (
                                                <tr key={index}>
                                                    <td>
                                                        <span className="product-rank">#{index + 1}</span>
                                                        <span className="product-name" title={product.productName}>
                                                            {product.productName.split(' – ')[0]}
                                                        </span>
                                                    </td>
                                                    <td className="center">
                                                        <span className="metric-badge recommend">{product.recommendations}</span>
                                                    </td>
                                                    <td className="center">
                                                        <span className="metric-badge cart">{product.cartAdditions}</span>
                                                    </td>
                                                    <td className="center">
                                                        <span className="metric-badge purchase">{product.purchases ?? 0}</span>
                                                    </td>
                                                    <td className="center">
                                                        <span className={`conversion-rate ${conversionRate >= 50 ? 'high' : conversionRate >= 25 ? 'medium' : 'low'}`}>
                                                            {conversionRate}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-data">
                                <div className="no-data-icon">📦</div>
                                <p>Pas encore de données produits</p>
                            </div>
                        )}
                    </div>

                    {/* Event Type Breakdown */}
                    <div className="chart-card">
                        <h3 className="chart-title">📈 Répartition des Événements</h3>
                        {isLoading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : stats?.eventTypeBreakdown?.length ? (
                            <div className="event-breakdown">
                                {stats.eventTypeBreakdown.slice(0, 6).map((item, index) => {
                                    const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];
                                    return (
                                        <div key={index} className="breakdown-item">
                                            <div className="breakdown-bar-wrapper">
                                                <div
                                                    className="breakdown-bar"
                                                    style={{
                                                        width: `${item.percentage}%`,
                                                        backgroundColor: colors[index % colors.length]
                                                    }}
                                                />
                                            </div>
                                            <div className="breakdown-info">
                                                <span className="breakdown-label">{item.eventType.replace(/_/g, ' ')}</span>
                                                <span className="breakdown-stats">{item.count} ({item.percentage}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="no-data">
                                <div className="no-data-icon">📭</div>
                                <p>Pas encore de données d&apos;événements</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Events Log - Hiding as per request */}
                {false && (
                    <div className="events-section">
                        <div className="events-header">
                            <h3 className="events-title">📋 Événements Récents</h3>
                            <div className="events-filters">
                                <select
                                    className="filter-select"
                                    value={eventFilter}
                                    onChange={(e) => { setEventFilter(e.target.value); setEventsPage(1); }}
                                >
                                    <option value="all">Tous les Événements</option>
                                    <option value="chat_api_request">Requête Chat</option>
                                    <option value="chat_api_response">Réponse Chat</option>
                                    <option value="ai_response_generated">Réponse IA</option>
                                    <option value="product_recommended">Produit Recommandé</option>
                                    <option value="add_to_cart">Ajout au Panier</option>
                                    <option value="plan_generated">Plan Généré</option>
                                </select>
                                <button
                                    className="filter-select"
                                    onClick={loadDashboardData}
                                    style={{ cursor: 'pointer' }}
                                >
                                    🔄 Actualiser
                                </button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : filteredEvents.length ? (
                            <>
                                <div className="events-table-wrapper">
                                    <table className="events-table">
                                        <thead>
                                            <tr>
                                                <th>Événement</th>
                                                <th>ID Utilisateur</th>
                                                <th>Session</th>
                                                <th>Détails</th>
                                                <th>Heure</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedEvents.map((event) => (
                                                <tr key={event.id}>
                                                    <td>
                                                        <span className={`event-badge ${getEventBadgeClass(event.event)}`}>
                                                            {event.event.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td>{event.userId || '—'}</td>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                                        {event.sessionId?.substring(0, 16)}...
                                                    </td>
                                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {event.properties?.product_name as string ||
                                                            event.properties?.source as string ||
                                                            '—'}
                                                    </td>
                                                    <td>{formatDate(event.timestamp)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination Controls */}
                                <div className="pagination-controls">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setEventsPage(1)}
                                        disabled={eventsPage === 1}
                                    >
                                        ««
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                                        disabled={eventsPage === 1}
                                    >
                                        «
                                    </button>
                                    <span className="pagination-info">
                                        Page {eventsPage} / {totalPages} ({filteredEvents.length} événements)
                                    </span>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setEventsPage(p => Math.min(totalPages, p + 1))}
                                        disabled={eventsPage === totalPages}
                                    >
                                        »
                                    </button>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setEventsPage(totalPages)}
                                        disabled={eventsPage === totalPages}
                                    >
                                        »»
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="no-data">
                                <div className="no-data-icon">📭</div>
                                <p>Aucun événement enregistré. Commencez à discuter pour générer des événements !</p>
                            </div>
                        )}
                    </div>
                )}
            </div >
        </div >
    );
}
