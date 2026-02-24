import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatINR, formatNum } from '../utils/formatCurrency';

const COLORS = ['#22d3ee', '#3b82f6', '#818cf8', '#6366f1'];

const ProfitLossDashboard = ({ data, theme, reportGranularity = 'monthly', customStart, customEnd }) => {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <DollarSign className="w-16 h-16 mb-4 text-slate-400 dark:text-slate-600" />
                <p className="font-bold uppercase tracking-widest text-xs text-slate-900 dark:text-white">Insufficient data for P&L analysis</p>
            </div>
        );
    }

    const isDark = theme === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? '#ffffff12' : '#00000010';
    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#ffffff10' : '#e2e8f0';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';

    // Date filtering function based on report frequency
    const filterDataByFrequency = (data, frequency) => {
        const now = new Date();
        const cutoffDate = new Date();

        switch (frequency) {
            case 'daily':
                cutoffDate.setHours(cutoffDate.getHours() - 24);
                break;
            case 'weekly':
                cutoffDate.setDate(cutoffDate.getDate() - 7);
                break;
            case 'monthly':
                cutoffDate.setDate(cutoffDate.getDate() - 30);
                break;
            case 'quarterly':
                cutoffDate.setDate(cutoffDate.getDate() - 90);
                break;
            case 'halfyearly':
                cutoffDate.setDate(cutoffDate.getDate() - 180);
                break;
            case 'yearly':
                cutoffDate.setDate(cutoffDate.getDate() - 365);
                break;
            case 'custom':
                if (customStart && customEnd) {
                    const start = new Date(customStart);
                    const end = new Date(customEnd);
                    return data.filter(item => {
                        const itemDate = new Date(item.month || item.date);
                        return itemDate >= start && itemDate <= end;
                    });
                }
                return data;
            default:
                return data;
        }

        return data.filter(item => {
            const itemDate = new Date(item.month || item.date);
            return itemDate >= cutoffDate;
        });
    };

    // Apply frequency filter
    const filteredData = filterDataByFrequency(data, reportGranularity);

    const totalSales = filteredData.reduce((sum, item) => sum + item.sales, 0);
    const totalExpenses = filteredData.reduce((sum, item) => sum + item.expenses, 0);
    const totalCogs = filteredData.reduce((sum, item) => sum + (item.cogs || 0), 0);
    const grossProfit = totalSales - totalCogs;
    const netProfit = filteredData.reduce((sum, item) => sum + (item.profit || 0), 0);
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0;

    const expenseBreakdown = [
        { name: 'Direct COGS', value: totalCogs },
        { name: 'Operating', value: totalExpenses },
    ];

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass p-6 bg-white/70 dark:bg-slate-900/70 border-white/20">
                    <div className="text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest mb-2">Total Revenue</div>
                    <div className="text-2xl md:text-3xl font-serif font-black text-slate-900 dark:text-white transition-all duration-500 truncate drop-shadow-sm">{formatINR(totalSales)}</div>
                </div>
                <div className="glass p-6 rounded-[2rem] border-rose-500/20 bg-rose-500/10 backdrop-blur-[12px] shadow-xl shadow-black/5">
                    <div className="text-rose-500 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest mb-2">Gross Profit</div>
                    <div className="text-2xl md:text-3xl font-serif font-black text-rose-500 dark:text-rose-400 truncate">{formatINR(grossProfit)}</div>
                    <div className="text-[8px] text-rose-500/60 font-bold uppercase mt-1 text-center">Sales - COGS</div>
                </div>
                <div className="glass p-6 bg-white/70 dark:bg-slate-900/70 border-white/20">
                    <div className="text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest mb-2">Operating Expenses</div>
                    <div className="text-2xl md:text-3xl font-serif font-black text-slate-900 dark:text-white transition-all duration-500 truncate drop-shadow-sm">{formatINR(totalExpenses)}</div>
                </div>
                <div className="glass p-6 rounded-[2rem] border-primary-500/20 bg-primary-500/10 backdrop-blur-[12px] shadow-xl shadow-black/5">
                    <div className="text-primary-500 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest mb-2">Net Profit</div>
                    <div className={`text-2xl md:text-3xl font-serif font-black truncate ${netProfit >= 0 ? 'text-primary-500 dark:text-primary-400' : 'text-red-500 dark:text-red-400'}`}>
                        {formatINR(netProfit)}
                    </div>
                    <div className="text-[8px] text-primary-500/60 font-bold uppercase mt-1 text-center">Gross - Expenses</div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass p-8 mt-6 dark:bg-slate-800">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h4 className="text-2xl font-serif font-black tracking-tight text-[#0f172a] dark:text-white">Profit Performance</h4>
                            <p className="text-[10px] text-slate-900 dark:text-white font-bold uppercase tracking-widest mt-1">Institutional Revenue Tracking</p>
                        </div>
                        <div className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest ${netProfit >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{profitMargin}% Margin</span>
                        </div>
                    </div>
                    <div className="w-full h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                <XAxis dataKey="month" stroke={textColor} fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke={textColor} fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '1rem', color: tooltipText }}
                                    itemStyle={{ fontSize: '12px' }}
                                    labelStyle={{ color: tooltipText }}
                                />
                                <Area type="monotone" dataKey="profit" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass p-10 rounded-[3rem] border-slate-200 dark:border-white/5 h-[450px] bg-white dark:bg-slate-800">
                    <h4 className="text-xl font-serif font-black tracking-tight text-slate-900 dark:text-white mb-2">Cost Breakdown</h4>
                    <p className="text-[10px] text-slate-900 dark:text-white font-bold uppercase tracking-widest mb-8">Profit & Inventory Analysis</p>
                    <div className="w-full h-[230px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseBreakdown}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {expenseBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#3b82f6'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '1rem', color: tooltipText }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 gap-4 mt-8">
                        {expenseBreakdown.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? '#f43f5e' : '#3b82f6' }}></div>
                                    <span className="text-[10px] text-slate-900 dark:text-white font-black uppercase tracking-widest">{item.name}</span>
                                </div>
                                <span className="text-xs font-serif text-slate-900 dark:text-white">{formatINR(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitLossDashboard;
