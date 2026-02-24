import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target } from 'lucide-react';
import { formatINR } from '../utils/formatCurrency';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DashboardPreview = () => {
    const lineData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Revenue',
                data: [4800, 5200, 4900, 5800, 6200, 7500, 6800],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                borderWidth: 3,
            },
            {
                label: 'Net Profit',
                data: [1200, 1100, 1600, 1500, 2100, 3200, 2800],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                borderWidth: 3,
                borderDash: [5, 5],
            }
        ],
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    color: '#0f172a',
                    font: { size: 11, weight: '900' },
                    usePointStyle: true,
                    padding: 25
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f8fafc',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: (context) => ` ${context.dataset.label}: ${formatINR(context.parsed.y)}`
                }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                ticks: {
                    color: '#64748b',
                    font: { size: 10 },
                    callback: (value) => '₹' + value / 1000 + 'k'
                }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } }
            },
        },
    };

    return (
        <div className="glass p-8 md:p-12 w-full max-w-[1200px] mx-auto group overflow-hidden relative">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 blur-[100px] -ml-32 -mb-32"></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center space-x-3 mb-3">
                            <Activity className="text-primary-400 w-5 h-5 animate-pulse" />
                            <span className="text-primary-400 text-[10px] font-black uppercase tracking-[0.3em]">Operational Intelligence</span>
                        </div>
                        <h3 className="text-2xl md:text-4xl font-serif font-black text-slate-900 dark:text-white tracking-tight leading-tight">Weekly Performance <span className="text-primary-500 italic">Analytics</span></h3>
                        <p className="text-slate-900 dark:text-white text-lg mt-3 font-medium opacity-80">Financial health overview for the current billing cycle.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="nav-pills px-6 py-3 flex items-center space-x-3">
                            <Target className="text-primary-500 w-5 h-5" />
                            <div className="flex flex-col">
                                <span className="text-slate-900 dark:text-white font-black text-base leading-none">92%</span>
                                <span className="text-slate-900 dark:text-white text-[9px] uppercase font-black tracking-widest opacity-60 mt-1">Goal Status</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-2xl flex items-center space-x-3 shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer group/btn">
                            <span className="font-black text-xs uppercase tracking-[0.2em]">Export Intelligence</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Total Revenue', value: '₹40,500', change: '+12.5%', trend: 'up', icon: DollarSign },
                        { label: 'Net Profit', value: '₹12,420', change: '+8.2%', trend: 'up', icon: TrendingUp },
                        { label: 'Op. Expenses', value: '₹28,080', change: '+4.1%', trend: 'down', icon: TrendingDown },
                        { label: 'Profit Margin', value: '30.6%', change: '-1.1%', trend: 'down', icon: Activity }
                    ].map((stat, i) => (
                        <div key={i} className="glass p-6 group/card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white transition-colors">
                                    <stat.icon className="w-5 h-5 pointer-events-none" />
                                </div>
                                <div className={`flex items-center space-x-1 text-[11px] font-black ${stat.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    <span>{stat.change}</span>
                                    {stat.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                </div>
                            </div>
                            <p className="text-slate-900 dark:text-white text-[10px] uppercase font-black tracking-widest mb-2 opacity-60">{stat.label}</p>
                            <p className="text-2xl md:text-3xl font-serif font-black text-slate-900 dark:text-white truncate">{stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="relative h-[450px] w-full glass p-10 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="absolute top-8 left-10 flex items-center space-x-8 z-10">
                        <div className="flex items-center space-x-3">
                            <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                            <span className="text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest">Revenue</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest">Profit</span>
                        </div>
                    </div>
                    <Line data={lineData} options={lineOptions} />
                </div>
            </div>
        </div>
    );
};

export default DashboardPreview;
