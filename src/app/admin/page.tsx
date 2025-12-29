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
    topProducts: Array<{ productName: string; recommendations: number; cartAdditions: number }>;
    eventsByDay: Array<{ date: string; events: Record<string, number>; total: number }>;
    eventTypeBreakdown: Array<{ eventType: string; count: number; percentage: number }>;
    todayVsYesterday: {
        today: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        yesterday: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
        changes: { conversations: number; recommendations: number; cartAdditions: number; revenue: number };
    };
    hourlyActivity: Array<{ hour: number; events: number }>;
}

interface AnalyticsEvent {
    _id: string;
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
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [eventFilter, setEventFilter] = useState('all');
    const [eventsPage, setEventsPage] = useState(1);
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

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [statsRes, eventsRes, usageRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/events?limit=50'),
                fetch('/api/admin/usage')
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.data);
            }

            if (eventsRes.ok) {
                const eventsData = await eventsRes.json();
                setEvents(eventsData.data || []);
            }

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
                        <div className="kpi-label">Chiffre d&apos;Affaires</div>
                        <div className="kpi-value revenue">€{stats?.totalRevenue?.toFixed(2) ?? '0.00'}</div>
                        <div className="kpi-subtext">{stats?.totalCartAdditions ?? 0} articles ajoutés au panier</div>
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
                <div className="charts-grid">
                    {/* Today vs Yesterday */}
                    <div className="chart-card">
                        <h3 className="chart-title">📊 Aujourd&apos;hui vs Hier</h3>
                        {isLoading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : stats?.todayVsYesterday ? (
                            <div className="comparison-grid">
                                <div className="comparison-item">
                                    <div className="comparison-label">💬 Conversations</div>
                                    <div className="comparison-values">
                                        <span className="today-value">{stats.todayVsYesterday.today.conversations}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">{stats.todayVsYesterday.yesterday.conversations}</span>
                                    </div>
                                    <span className={`change-badge ${stats.todayVsYesterday.changes.conversations >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.todayVsYesterday.changes.conversations >= 0 ? '↑' : '↓'} {Math.abs(stats.todayVsYesterday.changes.conversations)}%
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <div className="comparison-label">🎯 Recommandations</div>
                                    <div className="comparison-values">
                                        <span className="today-value">{stats.todayVsYesterday.today.recommendations}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">{stats.todayVsYesterday.yesterday.recommendations}</span>
                                    </div>
                                    <span className={`change-badge ${stats.todayVsYesterday.changes.recommendations >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.todayVsYesterday.changes.recommendations >= 0 ? '↑' : '↓'} {Math.abs(stats.todayVsYesterday.changes.recommendations)}%
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <div className="comparison-label">🛒 Ajouts Panier</div>
                                    <div className="comparison-values">
                                        <span className="today-value">{stats.todayVsYesterday.today.cartAdditions}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">{stats.todayVsYesterday.yesterday.cartAdditions}</span>
                                    </div>
                                    <span className={`change-badge ${stats.todayVsYesterday.changes.cartAdditions >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.todayVsYesterday.changes.cartAdditions >= 0 ? '↑' : '↓'} {Math.abs(stats.todayVsYesterday.changes.cartAdditions)}%
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <div className="comparison-label">💰 Revenus</div>
                                    <div className="comparison-values">
                                        <span className="today-value">€{stats.todayVsYesterday.today.revenue}</span>
                                        <span className="vs-text">vs</span>
                                        <span className="yesterday-value">€{stats.todayVsYesterday.yesterday.revenue}</span>
                                    </div>
                                    <span className={`change-badge ${stats.todayVsYesterday.changes.revenue >= 0 ? 'positive' : 'negative'}`}>
                                        {stats.todayVsYesterday.changes.revenue >= 0 ? '↑' : '↓'} {Math.abs(stats.todayVsYesterday.changes.revenue)}%
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
                            <div className="hourly-chart-container">
                                <div className="hourly-chart hourly-row">
                                    {stats.hourlyActivity.slice(0, 12).map((hour, index) => {
                                        const maxEvents = Math.max(...stats.hourlyActivity.map(h => h.events), 1);
                                        return (
                                            <div key={index} className="hourly-bar-wrapper" title={`${hour.hour}:00 - ${hour.events} événements`}>
                                                <div
                                                    className="hourly-bar"
                                                    style={{ height: `${Math.max((hour.events / maxEvents) * 100, 5)}%` }}
                                                />
                                                <span className="hourly-label">{hour.hour}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="hourly-chart hourly-row">
                                    {stats.hourlyActivity.slice(12, 24).map((hour, index) => {
                                        const maxEvents = Math.max(...stats.hourlyActivity.map(h => h.events), 1);
                                        return (
                                            <div key={index + 12} className="hourly-bar-wrapper" title={`${hour.hour}:00 - ${hour.events} événements`}>
                                                <div
                                                    className="hourly-bar"
                                                    style={{ height: `${Math.max((hour.events / maxEvents) * 100, 5)}%` }}
                                                />
                                                <span className="hourly-label">{hour.hour}</span>
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
                                                            {product.productName}
                                                        </span>
                                                    </td>
                                                    <td className="center">
                                                        <span className="metric-badge recommend">{product.recommendations}</span>
                                                    </td>
                                                    <td className="center">
                                                        <span className="metric-badge cart">{product.cartAdditions}</span>
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

                {/* Events Log */}
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
                                            <tr key={event._id}>
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
            </div>
        </div>
    );
}
