import React, { useMemo, useState } from 'react';
import {
    BarChart3,
    Calendar,
    TrendingUp,
    CheckCircle2,
    Plus,
    Minus,
    Calculator,
    LayoutDashboard
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { formatINR } from '../utils/formatCurrency';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const SimpleSummaryDashboard = ({ transactions = [] }) => {
    const [period, setPeriod] = useState('Weekly');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const aggregatedData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let labels = [];
        let revenueData = [];
        let expenseData = [];
        let profitData = [];

        if (period === 'Daily') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const label = d.toLocaleDateString([], { weekday: 'short' });
                labels.push(label);

                const dayTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate.toDateString() === d.toDateString();
                });

                const rev = dayTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0);
                const exp = dayTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
                const prof = dayTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0);

                revenueData.push(rev);
                expenseData.push(exp);
                profitData.push(prof);
            }
        } else if (period === 'Weekly') {
            // Current month by weeks (approximate)
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            for (let w = 0; w < 4; w++) {
                const startDay = w * 7 + 1;
                const endDay = (w + 1) * 7;

                const weekTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth && tDate.getDate() >= startDay && tDate.getDate() <= endDay;
                });

                const rev = weekTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0);
                const exp = weekTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
                const prof = weekTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0);

                revenueData.push(rev);
                expenseData.push(exp);
                profitData.push(prof);
            }
        } else if (period === 'Monthly') {
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels.forEach((month, idx) => {
                const monthTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate.getFullYear() === currentYear && tDate.getMonth() === idx;
                });
                revenueData.push(monthTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(monthTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(monthTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            });
        } else if (period === 'Quarterly') {
            labels = ['Q1', 'Q2', 'Q3', 'Q4'];
            for (let q = 0; q < 4; q++) {
                const quarterTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    const tQ = Math.floor(tDate.getMonth() / 3);
                    return tDate.getFullYear() === currentYear && tQ === q;
                });
                revenueData.push(quarterTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(quarterTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(quarterTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            }
        } else if (period === 'Yearly') {
            const years = [...new Set(transactions.map(t => new Date(t.timestamp).getFullYear()))].sort();
            labels = years.length > 0 ? years.map(String) : [currentYear.toString()];
            labels.forEach(year => {
                const yearTxns = transactions.filter(t => new Date(t.timestamp).getFullYear().toString() === year);
                revenueData.push(yearTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(yearTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(yearTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            });
        } else if (period === 'HalfYearly') {
            labels = ['H1 (Jan-Jun)', 'H2 (Jul-Dec)'];
            for (let h = 0; h < 2; h++) {
                const halfTxns = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    const m = tDate.getMonth();
                    return tDate.getFullYear() === currentYear && (h === 0 ? m < 6 : m >= 6);
                });
                revenueData.push(halfTxns.filter(t => t.type === 'Sale').reduce((acc, t) => acc + t.amount, 0));
                expenseData.push(halfTxns.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));
                profitData.push(halfTxns.reduce((acc, t) => acc + (t.profit || (t.type === 'Sale' ? t.amount : -t.amount)), 0));
            }
        } else if (period === 'Custom') {
            if (customStart && customEnd) {
                const start = new Date(customStart);
                const end = new Date(customEnd);
                const filtered = transactions.filter(t => {
                    const tDate = new Date(t.timestamp);
                    return tDate >= start && tDate <= end;
                });
                // Group by month within the custom range
                const monthMap = {};
                filtered.forEach(t => {
                    const d = new Date(t.timestamp);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthMap[key]) monthMap[key] = { rev: 0, exp: 0, prof: 0 };
                    if (t.type === 'Sale') monthMap[key].rev += t.amount;
                    if (t.type === 'Expense') monthMap[key].exp += t.amount;
                    monthMap[key].prof += (t.profit || (t.type === 'Sale' ? t.amount : -t.amount));
                });
                const sortedKeys = Object.keys(monthMap).sort();
                labels = sortedKeys;
                sortedKeys.forEach(k => {
                    revenueData.push(monthMap[k].rev);
                    expenseData.push(monthMap[k].exp);
                    profitData.push(monthMap[k].prof);
                });
            }
        }

        return { labels, revenueData, expenseData, profitData };
    }, [transactions, period, customStart, customEnd]);

    const chartData = {
        labels: aggregatedData.labels,
        datasets: [
            {
                label: 'Revenue',
                data: aggregatedData.revenueData,
                backgroundColor: 'rgba(59, 130, 246, 0.9)', // Higher opacity
                borderRadius: 8,
            },
            {
                label: 'Expenses',
                data: aggregatedData.expenseData,
                backgroundColor: 'rgba(244, 63, 94, 0.9)', // Higher opacity
                borderRadius: 8,
            },
            {
                label: 'Profit',
                data: aggregatedData.profitData,
                backgroundColor: 'rgba(16, 185, 129, 0.9)', // Higher opacity
                borderRadius: 8,
            }
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'currentColor',
                    font: { size: 12, weight: '800' }
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1'
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: 'currentColor',
                    font: { size: 11, weight: '700' }
                }
            },
            y: {
                grid: { color: 'rgba(128, 128, 128, 0.1)' },
                ticks: {
                    color: 'currentColor',
                    font: { size: 11, weight: '700' }
                }
            }
        }
    };

    const periodTotalProfit = aggregatedData.profitData.reduce((acc, val) => acc + val, 0);

    return (
        <div className="glass p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-10">
                <div className="p-3 bg-primary-500 rounded-2xl text-white">
                    <Calculator className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Profit Calculation Dashboard</h2>
            </div>

            {/* Main Content Card */}
            <div className="glass p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{period} Profit Analysis</h3>
                    </div>

                    {/* Period Switcher */}
                    <div className="nav-pills">
                        {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'HalfYearly', 'Yearly', 'Custom'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${period === p ? 'bg-white dark:bg-primary-500 text-primary-600 dark:text-white shadow-sm' : 'text-slate-900 dark:text-white hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {p === 'HalfYearly' ? 'Half-Year' : p === 'Custom' ? '📅 Custom' : p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Date Range Pickers */}
                {period === 'Custom' && (
                    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white flex-shrink-0">From</span>
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white flex-shrink-0">To</span>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />
                    </div>
                )}

                <div className="h-[300px] mb-10">
                    <Bar data={chartData} options={options} />
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-10 ml-2">
                    <div className="flex items-center space-x-3 text-slate-900 dark:text-white">
                        <TrendingUp className="w-5 h-5 text-primary-500" />
                        <span className="text-sm font-black">Automatic profit calculation</span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-900 dark:text-white">
                        <Calendar className="w-5 h-5 text-primary-400" />
                        <span className="text-sm font-black">Daily/weekly/monthly summaries</span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-900 dark:text-white">
                        <BarChart3 className="w-5 h-5 text-primary-300" />
                        <span className="text-sm font-black">Revenue vs expenses breakdown</span>
                    </div>
                </div>

                {/* Status Footer */}
                <div className="bg-primary-50 dark:bg-primary-500/10 rounded-2xl p-6 flex justify-between items-center border border-primary-100 dark:border-primary-500/20">
                    <div className="flex items-center space-x-3 text-primary-700 dark:text-primary-300">
                        <TrendingUp className="w-5 h-5 text-primary-500" />
                        <span className="font-black uppercase tracking-widest text-sm">Current {period} Profit</span>
                    </div>
                    <div className="text-2xl font-black text-primary-600 dark:text-primary-400">
                        {periodTotalProfit >= 0 ? '+' : ''}{formatINR(periodTotalProfit)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimpleSummaryDashboard;
