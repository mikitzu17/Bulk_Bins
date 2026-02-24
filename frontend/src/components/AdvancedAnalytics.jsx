import React, { useEffect, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { formatINR, formatNum } from '../utils/formatCurrency';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity, Award, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAiDashboard } from '../services/aiApi';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";

const AdvancedAnalytics = ({ businessId, onClose, theme }) => {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [analyticsRes, statsRes] = await Promise.all([
                    fetch(`${API_URL}/businesses/${businessId}/ai/advanced-analytics`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    getAiDashboard(businessId, 'monthly')
                ]);

                if (analyticsRes.ok) {
                    const result = await analyticsRes.json();
                    setData(result);
                }
                setStats(statsRes);
            } catch (error) {
                console.error('Failed to fetch analytics', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [businessId, token]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-slate-900 dark:text-white font-serif animate-pulse">Computing complex insights...</div>
            </div>
        );
    }

    if (!data) return null;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const tooltipBody = isDark ? '#cbd5e1' : '#334155';
    const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // --- Chart Config ---
    const dailyLabels = data.daily_trends.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const lineChartData = {
        labels: dailyLabels,
        datasets: [
            {
                label: 'Sales Revenue',
                data: data.daily_trends.map(d => d.sales),
                borderColor: isDark ? '#22d3ee' : '#0891b2',
                backgroundColor: isDark ? 'rgba(34, 211, 238, 0.12)' : 'rgba(8, 145, 178, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: isDark ? '#22d3ee' : '#0891b2',
                pointBorderColor: isDark ? '#1e293b' : '#fff',
                pointBorderWidth: 2,
            },
            {
                label: 'Operating Expenses',
                data: data.daily_trends.map(d => d.expenses),
                borderColor: isDark ? '#fb7185' : '#e11d48',
                backgroundColor: isDark ? 'rgba(251, 113, 133, 0.08)' : 'rgba(225, 29, 72, 0.06)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 4,
                pointBackgroundColor: isDark ? '#fb7185' : '#e11d48',
                pointBorderColor: isDark ? '#1e293b' : '#fff',
                pointBorderWidth: 2,
            }
        ]
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: tooltipBg,
                titleColor: tooltipText,
                bodyColor: tooltipBody,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: (context) => ` ${context.dataset.label}: ${formatINR(context.parsed.y)}`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
            y: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textColor, font: { size: 11 }, callback: (v) => formatINR(v) } }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    // Curated vibrant color palettes for doughnut charts
    const salesColors = isDark
        ? ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185']
        : ['#0891b2', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48'];
    const expenseColors = isDark
        ? ['#fb7185', '#f97316', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#e879f9']
        : ['#e11d48', '#ea580c', '#d97706', '#65a30d', '#059669', '#0d9488', '#0284c7', '#4f46e5', '#c026d3'];

    const createDoughnutData = (items, colors) => ({
        labels: items.map(i => i.name),
        datasets: [{
            data: items.map(i => i.value),
            backgroundColor: colors.slice(0, items.length),
            borderColor: isDark ? '#1e293b' : '#ffffff',
            borderWidth: 2,
            hoverOffset: 12
        }]
    });

    const doughnutOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: textColor,
                    font: { size: 11, weight: 'bold' },
                    usePointStyle: true,
                    padding: 12
                }
            },
            tooltip: {
                backgroundColor: tooltipBg,
                titleColor: tooltipText,
                bodyColor: tooltipBody,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: (context) => ` ${context.label}: ${formatINR(context.parsed)}`
                }
            }
        },
        cutout: '72%'
    };

    const totalSales = data.daily_trends.reduce((acc, curr) => acc + (curr.sales || 0), 0);
    const totalExpenses = data.daily_trends.reduce((acc, curr) => acc + (curr.expenses || 0), 0);
    const netProfit = totalSales - totalExpenses;

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>

                    <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary-500" />
                        Advanced <span className="text-primary-500 italic">Analytics</span>
                    </h1>
                    <p className="text-slate-900 dark:text-white mt-2 text-sm font-black">Deep dive into your business metrics for the last 30 days.</p>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4">
                    <div className="glass px-8 py-5 bg-emerald-500/10 border-emerald-500/20 backdrop-blur-[12px]">
                        <div className="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-widest font-black mb-1">Net Profit (30d)</div>
                        <div className="text-2xl md:text-3xl font-serif font-black text-emerald-600 dark:text-emerald-400 truncate">{formatINR(netProfit)}</div>
                    </div>
                </div>
            </div>

            {/* Main Trend Chart */}
            <div className="glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h3 className="text-xl font-serif font-black tracking-tight text-slate-900 dark:text-white">Daily Performance Trends</h3>
                    <div className="nav-pills px-4 py-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Income</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">Spend</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="h-[350px] w-full relative z-10">
                    <Line data={lineChartData} options={lineOptions} />
                </div>
            </div>

            {/* Category Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sales Breakdown */}
                <div className="glass p-8">
                    <h3 className="text-xl font-serif font-black tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        Revenue Sources
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <Doughnut data={createDoughnutData(data.sales_by_category, salesColors)} options={doughnutOptions} />
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="glass p-8">
                    <h3 className="text-xl font-serif font-black tracking-tight text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                        Cost Distribution
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <Doughnut data={createDoughnutData(data.expenses_by_category, expenseColors)} options={doughnutOptions} />
                    </div>
                </div>
            </div>

            {/* AI Insights & Product Leaderboard (Moved from Overview) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PRODUCT LEADERBOARD */}
                <div className="lg:col-span-1 glass p-8 flex flex-col">
                    <div className="mb-8 flex justify-between items-end">
                        <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <Award className="w-6 h-6 text-primary-500" />
                            Leaderboard
                        </h3>
                    </div>

                    <div className="space-y-8 flex-grow">
                        <div>
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Top Selling (Quantity)
                            </p>
                            <div className="space-y-4">
                                {stats?.product_performance?.top_selling?.length > 0 ? (
                                    stats.product_performance.top_selling.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center group/item hover:translate-x-1 transition-transform">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white group-hover/item:text-primary-500 transition-colors">{p.name}</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full shadow-sm">{p.total_qty} Units</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs italic text-slate-900 dark:text-white">Recording live data...</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Most Profitable (INR)
                            </p>
                            <div className="space-y-4">
                                {stats?.product_performance?.top_profitable?.length > 0 ? (
                                    stats.product_performance.top_profitable.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center group/item hover:translate-x-1 transition-transform">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white group-hover/item:text-primary-500 transition-colors">{p.name}</span>
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">{formatINR(p.total_profit)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs italic text-slate-900 dark:text-white">Computing margins...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STRATEGIC RECOMMENDATIONS */}
                <div className="lg:col-span-2 glass p-10 bg-slate-900 dark:bg-slate-900 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 blur-[120px] -mr-40 -mt-40"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 blur-[100px] -ml-32 -mb-32"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="p-3 bg-primary-500/20 rounded-2xl border border-primary-500/30">
                                <Sparkles className="w-6 h-6 text-primary-400 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-serif font-black tracking-tight">AI Strategic Intelligence</h3>
                                <p className="text-slate-300 text-xs font-medium uppercase tracking-widest">Growth Optimization Hub</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {stats?.alerts?.filter(a => ['Strategy', 'Growth', 'Insight'].includes(a.level)).length > 0 ? (
                                stats.alerts.filter(a => ['Strategy', 'Growth', 'Insight'].includes(a.level)).map((alert, i) => (
                                    <div key={i} className={`p-6 rounded-3xl border bg-white/5 backdrop-blur-xl group hover:shadow-2xl transition-all duration-500 ${alert.color === 'red' ? 'border-rose-500/20 hover:border-rose-500/40' :
                                        alert.color === 'orange' ? 'border-amber-500/20 hover:border-amber-500/40' :
                                            alert.color === 'indigo' ? 'border-indigo-500/20 hover:border-indigo-500/40' :
                                                'border-emerald-500/20 hover:border-emerald-500/40'
                                        }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${alert.level === 'Strategy' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                                                alert.level === 'Growth' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                    'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                }`}>
                                                {alert.level}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-black text-white mb-2 leading-tight uppercase tracking-wide">{alert.title}</h4>
                                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                            {alert.message}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-16 text-center">
                                    <Sparkles className="w-12 h-12 mx-auto mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Optimizing growth strategies...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 pt-8 mt-10 border-t border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">System Ready</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">BulkBins Intelligence v3</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalytics;
