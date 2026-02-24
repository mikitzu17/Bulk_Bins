import React, { useMemo, useState, useEffect } from 'react';
import {
    Activity,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Zap,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Layers,
    Wand2,
    AlertCircle
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatINR } from '../utils/formatCurrency';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const noScrollbarStyle = {
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
};

const HighFidelityDashboard = ({
    inventory = [],
    transactions = [],
    aiPredictions = null,
    pnlData = [],
    inventoryInsights = null,
    profitInsights = []
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const istTime = currentTime.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });


    const reorders = inventoryInsights?.reorder_recommendations || [];
    const profitStars = profitInsights?.profit_insights || [];

    // Calculate total stats
    const totalRevenue = useMemo(() =>
        transactions.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0),
        [transactions]);

    const totalExpenses = useMemo(() =>
        transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0),
        [transactions]);

    const totalCogs = useMemo(() =>
        transactions.reduce((acc, t) => acc + (t.cogs || 0), 0),
        [transactions]);

    const inventoryValuation = useMemo(() =>
        inventory.reduce((acc, item) => acc + (item.stock_quantity * (item.cost_price || 0)), 0),
        [inventory]);

    const netProfit = useMemo(() =>
        transactions.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0),
        [transactions]);

    const lowStockItems = useMemo(() =>
        inventory.filter(item => item.stock_quantity <= (item.reorder_level || 5)),
        [inventory]);

    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Calculate Growth Rate (MoM)
    const growthRate = useMemo(() => {
        if (pnlData.length < 2) return 0;
        const current = pnlData[pnlData.length - 1].sales;
        const previous = pnlData[pnlData.length - 2].sales;
        return previous > 0 ? ((current - previous) / previous) * 100 : 0;
    }, [pnlData]);

    // Prepare Chart Data
    const chartData = {
        labels: pnlData.length > 0 ? pnlData.map(d => d.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Revenue',
                data: pnlData.length > 0 ? pnlData.map(d => d.sales) : [4000, 3000, 5000, 4500, 6000, 8000],
                fill: false,
                borderColor: '#10b981', // Emerald 500
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: 'Profit',
                data: pnlData.length > 0 ? pnlData.map(d => d.profit) : [1200, 800, 1500, 1100, 2000, 3200],
                fill: false,
                borderColor: '#3b82f6', // Blue 500
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            }
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 10,
                bottom: 10,
                left: 0,
                right: 10
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#0f172a',
                titleColor: '#94a3b8',
                bodyColor: '#f8fafc',
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context) => ` ${context.dataset.label}: ${formatINR(context.parsed.y)}`
                }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(148, 163, 184, 0.1)', drawBorder: false },
                border: { display: false },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10, weight: '600' },
                    padding: 8,
                    callback: (value) => value >= 1000 ? `₹${value / 1000}k` : `₹${value}`
                }
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10, weight: '600' },
                    padding: 8
                }
            },
        },
    };

    return (
        <div className="space-y-8 text-slate-900 dark:text-white pb-10">
            {/* Header with Live IST Time */}
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-serif font-black tracking-tight text-slate-900 dark:text-white">Premium <span className="text-primary-500 italic">Overview</span></h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Executive Business Intelligence</p>
                </div>
                <div className="glass px-4 py-2 border-primary-500/20 flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                    <span className="text-xs font-black tracking-widest text-slate-900 dark:text-white uppercase">Live IST: {istTime}</span>
                </div>
            </div>

            {/* Row 1: Executive KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Revenue', value: formatINR(totalRevenue), trend: growthRate, icon: DollarSign, color: 'text-emerald-500' },
                    { label: 'Net Profit', value: formatINR(netProfit), trend: null, icon: TrendingUp, color: 'text-blue-500' },
                    { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%`, trend: null, icon: Activity, color: 'text-indigo-500' },
                    { label: 'Growth (MoM)', value: `${growthRate.toFixed(1)}%`, trend: growthRate, icon: Zap, color: 'text-amber-500' },
                    { label: 'Asset Valuation', value: formatINR(inventoryValuation), trend: null, icon: Package, color: 'text-slate-500' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 ${stat.color}`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            {stat.trend !== null && (
                                <span className={`text-[10px] font-bold ${stat.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {stat.trend >= 0 ? '+' : ''}{stat.trend.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Row 2: Main Revenue vs Profit Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Revenue Performance</h3>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenue</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Profit</span>
                        </div>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Row 3: AI Business Insights & Intelligence Hub */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-3xl shadow-sm h-full">
                        <div className="flex items-center space-x-2 mb-6">
                            <Wand2 className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">AI Business Insights</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Growth & Forecasting</h4>
                                    <ul className="space-y-3">
                                        <li className="flex items-start space-x-3 text-sm">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                Revenue is trending {growthRate >= 0 ? 'upward' : 'downward'} by {Math.abs(growthRate).toFixed(1)}% MoM.
                                                Forecast suggests stable performance for the next quarter.
                                            </span>
                                        </li>
                                        {profitStars.length > 0 && (
                                            <li className="flex items-start space-x-3 text-sm">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    Top performing category is <strong className="text-slate-900 dark:text-white">{profitStars[0].name}</strong> with a {profitStars[0].margin}% margin.
                                                </span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Inventory & Risk</h4>
                                    <ul className="space-y-3">
                                        {lowStockItems.length > 0 ? (
                                            <li className="flex items-start space-x-3 text-sm">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    <strong className="text-rose-500">{lowStockItems.length} items</strong> are below reorder level. Potential stockout risk detected.
                                                </span>
                                            </li>
                                        ) : (
                                            <li className="flex items-start space-x-3 text-sm">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                                                <span className="text-slate-600 dark:text-slate-400">Inventory levels are currently optimized. No immediate restocks required.</span>
                                            </li>
                                        )}
                                        {aiPredictions?.overspending?.alert && (
                                            <li className="flex items-start space-x-3 text-sm">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    Spending anomaly detected: Recent expenses exceed baseline by {formatINR(aiPredictions.overspending.excess_amount)}.
                                                </span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-3xl shadow-sm h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Optimizations</h3>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {reorders.slice(0, 3).map((rec, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{rec.item_name}</span>
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{rec.status}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-slate-900 dark:text-white">+{rec.recommended_qty} units</div>
                                        <div className="text-[9px] font-bold text-rose-500">₹{Math.ceil(rec.lost_profit_risk)} Risk</div>
                                    </div>
                                </div>
                            ))}
                            {reorders.length === 0 && (
                                <div className="text-center py-10 opacity-50">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Calculations Complete</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Recent Activity Stream */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent Activity</h3>
                    </div>
                    <button className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:underline">View All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {transactions.slice(0, 6).map((t, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 rounded-2xl border border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <div className={`p-2 rounded-xl ${t.type === 'Sale' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}>
                                {t.type === 'Sale' ? <DollarSign className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.description || t.category}</div>
                                <div className="text-[10px] text-slate-400 font-medium">
                                    {new Date(t.timestamp).toLocaleTimeString('en-IN', {
                                        timeZone: 'Asia/Kolkata',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            <div className={`text-sm font-bold ${t.type === 'Sale' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {t.type === 'Sale' ? '+' : '-'}₹{t.amount}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HighFidelityDashboard;
