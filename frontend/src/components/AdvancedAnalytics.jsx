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
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${API_URL}/businesses/${businessId}/ai/advanced-analytics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
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
                <div className="text-slate-400 font-serif animate-pulse">Computing complex insights...</div>
            </div>
        );
    }

    if (!data) return null;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
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

                    <h1 className="text-4xl md:text-5xl font-serif font-black text-[#0f172a] dark:text-white flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary-500 dark:text-primary-400" />
                        Advanced Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Deep dive into your business metrics for the last 30 days.</p>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4">
                    <div className="glass px-8 py-5 rounded-[2rem] bg-emerald-500/10 border-emerald-500/20 backdrop-blur-[12px] shadow-xl shadow-black/5">
                        <div className="text-emerald-500 dark:text-emerald-400 text-[10px] uppercase tracking-widest font-black">Net Profit (30d)</div>
                        <div className="text-2xl md:text-3xl font-serif font-black text-emerald-500 dark:text-emerald-400 truncate">{formatINR(netProfit)}</div>
                    </div>
                </div>
            </div>

            {/* Main Trend Chart */}
            <div className="glass p-8 rounded-[3rem] border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-serif text-slate-900 dark:text-white">Daily Performance Trends</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Income</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Spend</span>
                        </div>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <Line data={lineChartData} options={lineOptions} />
                </div>
            </div>

            {/* Category Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sales Breakdown */}
                <div className="glass p-8 rounded-[3rem] border-slate-200 dark:border-white/5 bg-white dark:bg-white/5">
                    <h3 className="text-xl font-serif text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        Revenue Sources
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <Doughnut data={createDoughnutData(data.sales_by_category, salesColors)} options={doughnutOptions} />
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="glass p-8 rounded-[3rem] border-slate-200 dark:border-white/5 bg-white dark:bg-white/5">
                    <h3 className="text-xl font-serif text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                        Cost Distribution
                    </h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <Doughnut data={createDoughnutData(data.expenses_by_category, expenseColors)} options={doughnutOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedAnalytics;
