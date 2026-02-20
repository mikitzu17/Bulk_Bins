import React, { useMemo } from 'react';
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

    // Prepare Chart Data
    const chartData = {
        labels: pnlData.length > 0 ? pnlData.map(d => d.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Revenue',
                data: pnlData.length > 0 ? pnlData.map(d => d.sales) : [4000, 3000, 5000, 4500, 6000, 8000],
                fill: true,
                borderColor: '#10b981', // Emerald 500
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
            },
            {
                label: 'Profit',
                data: pnlData.length > 0 ? pnlData.map(d => d.profit) : [1200, 800, 1500, 1100, 2000, 3200],
                fill: true,
                borderColor: '#3b82f6', // Blue 500
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                borderDash: [5, 5],
            }
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
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
                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 10 }, callback: (value) => formatINR(value) }
            },
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        },
    };

    return (
        <div className="space-y-6 text-slate-200 animate-in fade-in duration-700">
            {/* Asset Ticker Row */}
            <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar" style={noScrollbarStyle}>
                {inventory.slice(0, 8).map((item, i) => (
                    <div key={i} className="glass min-w-[200px] p-4 rounded-2xl border-white/5 bg-slate-900/40 relative overflow-hidden group hover:border-primary-500/20 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-500 text-[9px] uppercase font-black tracking-widest">{item.category}</span>
                            {item.stock_quantity > item.reorder_level ? (
                                <ArrowUpRight className="w-3 h-3 text-green-400" />
                            ) : (
                                <ArrowDownRight className="w-3 h-3 text-red-400" />
                            )}
                        </div>
                        <div className="text-sm font-bold truncate mb-1">{item.name}</div>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-white font-serif">₹{item.selling_price}</span>
                            <span className={`text-[9px] font-bold ${item.stock_quantity > item.reorder_level ? 'text-green-400' : 'text-red-400'}`}>
                                {item.stock_quantity} UNIT
                            </span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-500/10 to-transparent group-hover:via-primary-500/40 transition-all"></div>
                    </div>
                ))}
            </div>

            {/* Main Terminal Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Visualizer */}
                <div className="lg:col-span-8 flex flex-col space-y-6">
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-slate-950/50 flex-grow relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] -mr-48 -mt-48"></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Activity className="w-4 h-4 text-primary-400" />
                                        <span className="text-primary-400 text-[10px] font-black uppercase tracking-[0.3em]">Performance Terminal</span>
                                    </div>
                                    <h2 className="text-3xl font-serif text-white tracking-tight">Revenue vs Profit</h2>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profit</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-grow min-h-[350px]">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    {/* Sub Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Volume', value: formatINR(totalRevenue), icon: Layers, color: 'text-primary-400' },
                            { label: 'Net Variance', value: formatINR(netProfit), icon: Zap, color: 'text-emerald-400' },
                            { label: 'Asset Valuation', value: formatINR(inventoryValuation), icon: Package, color: 'text-blue-400' },
                            { label: 'Cumulative COGS', value: formatINR(totalCogs), icon: DollarSign, color: 'text-rose-400' }
                        ].map((stat, i) => (
                            <div key={i} className="glass p-6 rounded-3xl border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{stat.label}</span>
                                </div>
                                <div className="text-2xl font-serif text-white">{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Inventory Alerts Section */}
                    {lowStockItems.length > 0 && (
                        <div className="glass p-8 rounded-[3rem] border-rose-500/20 bg-rose-500/5 mt-6 animate-pulse-slow">
                            <div className="flex items-start space-x-6">
                                <div className="p-4 bg-rose-500/20 rounded-2xl text-rose-400">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <div className="flex-grow">
                                    <h3 className="text-xl font-serif text-white mb-2">Restock Alert: {lowStockItems.length} items below reorder level</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {lowStockItems.map(item => (
                                            <span key={item.id} className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-rose-400">
                                                {item.name} (Qty: {item.stock_quantity})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => document.getElementById('inventory-tab-btn')?.click()}
                                    className="bg-rose-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20"
                                >
                                    Fulfill Store
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Intelligence & Stream */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Intelligence Intelligence Hub */}
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-slate-900/50 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-2">
                                <Wand2 className="w-4 h-4 text-primary-400" />
                                <span className="text-xs font-bold uppercase tracking-widest text-white">Intelligence Intelligence</span>
                            </div>
                            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-primary-500/60 animate-pulse">Neural Active</div>
                        </div>

                        <div className="space-y-8">
                            {/* Profit Stars */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-slate-500 text-[9px] uppercase font-black tracking-widest">Profit Stars</div>
                                    <Target className="w-3 h-3 text-primary-500" />
                                </div>
                                <div className="space-y-3">
                                    {profitStars.slice(0, 2).map((star, i) => (
                                        <div key={i} className="flex items-center justify-between group">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-1 h-1 rounded-full ${star.is_star ? 'bg-primary-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{star.name}</span>
                                            </div>
                                            <div className="text-[10px] font-black text-primary-400">+{star.margin}%</div>
                                        </div>
                                    ))}
                                    {profitStars.length === 0 && <div className="text-[10px] text-slate-600 italic">Analyzing performance...</div>}
                                </div>
                            </div>

                            <div className="h-px bg-white/5 mx-2"></div>

                            {/* Optimization Insights: Neural optimization insights with financial risk mapping */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-slate-500 text-[9px] uppercase font-black tracking-widest">Neural Optimization</div>
                                    <Zap className="w-3 h-3 text-primary-500" />
                                </div>
                                <div className="space-y-3">
                                    {reorders.slice(0, 4).map((rec, i) => (
                                        <div key={i} className={`flex flex-col p-4 rounded-3xl border transition-all group ${rec.category === 'Critical' ? 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10' :
                                            rec.category === 'Warning' ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10' :
                                                'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                                            }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-bold text-white tracking-tight">{rec.item_name}</span>
                                                    {rec.category === 'Critical' && (
                                                        <span className="px-2 py-0.5 bg-rose-500 text-white text-[7px] font-black uppercase rounded-full shadow-lg shadow-rose-500/30">Action Needed</span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    {rec.lost_profit_risk > 0 ? (
                                                        <div className="text-[10px] font-black text-rose-400 font-serif leading-none">₹{Math.ceil(rec.lost_profit_risk)} Risk</div>
                                                    ) : (
                                                        <div className="text-xs font-serif text-white tracking-tight leading-none">+{rec.recommended_qty} Units</div>
                                                    )}
                                                </div>
                                            </div>

                                            {rec.category === 'Critical' ? (
                                                <div className="space-y-3 mt-1">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                                                            <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Forecast</div>
                                                            <div className="text-[10px] text-white font-bold">{rec.days_to_stockout} days left</div>
                                                        </div>
                                                        <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                                                            <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Daily Sales</div>
                                                            <div className="text-[10px] text-white font-bold">{rec.avg_daily_sales} units</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between group-hover:px-1 transition-all">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest leading-none">Reorder Now</span>
                                                            <span className="text-[7px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Lead Time: {rec.lead_time} days</span>
                                                        </div>
                                                        <button
                                                            onClick={() => document.getElementById('inventory-tab-btn')?.click()}
                                                            className="text-[9px] font-black text-white bg-rose-500/20 px-3 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500 transition-colors"
                                                        >
                                                            Order {rec.recommended_qty} units
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${rec.category === 'Warning' ? 'text-amber-400' : 'text-slate-500'}`}>
                                                            {rec.status}
                                                        </span>
                                                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{rec.reason}</span>
                                                    </div>
                                                    <div className="text-[8px] text-slate-600 font-black uppercase tracking-widest">{rec.days_to_stockout}d Outlook</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {reorders.length === 0 && <div className="text-[10px] text-slate-600 italic">Core stock fully optimized.</div>}
                                </div>
                            </div>
                        </div>

                        {aiPredictions?.overspending?.alert && (
                            <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                                <div className="flex items-center space-x-3 text-red-400">
                                    <AlertCircle className="w-3 h-3" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Baseline Deviation</span>
                                </div>
                                <div className="text-[10px] text-white/40 mt-1">Spend exceeds average by ₹{aiPredictions?.overspending?.excess_amount}</div>
                            </div>
                        )}
                    </div>

                    {/* Recent Stream */}
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 bg-slate-950/30 flex flex-col h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-xs font-bold uppercase tracking-widest text-white">Recent Stream</span>
                            </div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-600">Live Updates</div>
                        </div>

                        <div className="flex-grow space-y-4 overflow-y-auto no-scrollbar pr-2">
                            {transactions.slice(0, 5).map((t, i) => (
                                <div key={i} className="flex items-center space-x-4 p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                    <div className={`p-2.5 rounded-xl ${t.type === 'Sale' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {t.type === 'Sale' ? <DollarSign className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-xs font-bold text-white mb-0.5 group-hover:text-primary-400 transition-colors">{t.description || t.category}</div>
                                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <div className={`text-sm font-bold font-serif ${t.type === 'Sale' ? 'text-green-400' : 'text-slate-400'}`}>
                                        {t.type === 'Sale' ? '+' : '-'}₹{t.amount}
                                    </div>
                                </div>
                            ))}
                            {transactions.length === 0 && (
                                <div className="text-center py-20 opacity-20">
                                    <Activity className="w-10 h-10 mx-auto mb-4" />
                                    <p className="text-[10px] uppercase font-black tracking-widest">Awaiting Transactions</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HighFidelityDashboard;
