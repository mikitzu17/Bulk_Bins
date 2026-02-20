import { useEffect, useState, useRef } from "react";
import { getCsvAnalysis, getTransactionAnalysis, uploadCsvForAnalysis } from "../services/aiApi";
import { formatINR, formatNum } from '../utils/formatCurrency';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const GRANULARITY_OPTIONS = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'quarterly', label: 'Quarterly' },
    { key: 'halfyearly', label: 'Half-Year' },
    { key: 'yearly', label: 'Yearly' },
    { key: 'custom', label: '📅 Custom' },
];

function AiForecast({ businessId, theme }) {
    const [analysisData, setAnalysisData] = useState(null);
    const [dataSource, setDataSource] = useState(null);
    const [csvGranularity, setCsvGranularity] = useState('weekly');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFilename, setUploadedFilename] = useState(null);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const fileInputRef = useRef(null);

    const isDark = theme === 'dark';
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, font: { size: 11, weight: 'bold' }, color: textColor, padding: 14 } },
            tooltip: {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                titleColor: isDark ? '#f8fafc' : '#0f172a',
                bodyColor: isDark ? '#cbd5e1' : '#475569',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${formatINR(ctx.parsed.y)}`
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: (v) => formatINR(v) } }
        }
    };

    // --- FETCH ANALYSIS ---
    useEffect(() => {
        if (!businessId) return;
        if (csvGranularity === 'custom' && (!customStart || !customEnd)) return;

        setIsLoading(true);
        const startDate = csvGranularity === 'custom' ? customStart : undefined;
        const endDate = csvGranularity === 'custom' ? customEnd : undefined;
        const granularityForApi = csvGranularity === 'custom' ? 'daily' : csvGranularity;

        getCsvAnalysis(businessId, granularityForApi, startDate, endDate)
            .then(csvData => {
                if (csvData && !csvData.error) {
                    setAnalysisData(csvData);
                    setDataSource('csv');
                    if (csvData.filename) setUploadedFilename(csvData.filename);
                } else {
                    return getTransactionAnalysis(businessId, granularityForApi, startDate, endDate)
                        .then(txnData => {
                            if (txnData && !txnData.error) {
                                setAnalysisData(txnData);
                                setDataSource('transactions');
                            }
                        });
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [businessId, csvGranularity, customStart, customEnd, refreshKey]);

    // --- FILE UPLOAD HANDLER ---
    const handleFileUpload = async (file) => {
        if (!file || !file.name.endsWith('.csv')) {
            alert('Please upload a .csv file');
            return;
        }
        setIsUploading(true);
        try {
            const result = await uploadCsvForAnalysis(businessId, file);
            setUploadedFilename(file.name);
            // Trigger re-fetch by incrementing refreshKey
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            alert(`Upload failed: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const onFileChange = (e) => {
        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
    };

    // --- LOADING STATE ---
    if (isLoading && !analysisData) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-serif animate-pulse">Analyzing historical data patterns...</p>
            </div>
        );
    }

    // --- EMPTY STATE (with upload) ---
    if (!analysisData) {
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-[#0f172a] dark:text-white flex items-center gap-3">
                        <span className="text-amber-400">✨</span> AI Prediction Hub
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Upload a dataset to unlock AI-powered forecasting</p>
                </div>

                {/* UPLOAD DROPZONE */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer group flex flex-col items-center justify-center p-16 rounded-[2.5rem] border-2 border-dashed transition-all duration-500 ${dragActive
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/5 scale-[1.01]'
                        : 'border-slate-300 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] hover:border-amber-400 hover:bg-amber-500/5'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={onFileChange}
                        className="hidden"
                    />

                    {isUploading ? (
                        <>
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <p className="text-amber-600 dark:text-amber-400 font-bold text-lg">Uploading & analyzing...</p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                                Drop your CSV dataset here
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-md mb-4">
                                or <span className="text-amber-600 dark:text-amber-400 font-bold underline underline-offset-2">click to browse</span> — Upload a transaction history CSV with Date, Type, Category, and Amount columns
                            </p>
                            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                <span>📊 .CSV format</span>
                                <span>•</span>
                                <span>📈 Sales & Expenses</span>
                                <span>•</span>
                                <span>🔮 Instant AI Analysis</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // --- MAIN VIEW (with data) ---
    return (
        <div className="animate-fade-in-up">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-[#0f172a] dark:text-white flex items-center gap-3">
                        <span className="text-amber-400">✨</span> AI Prediction Hub
                    </h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                            Multi-series forecasting & trend analysis
                        </p>
                        {/* DATA SOURCE BADGE */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${dataSource === 'csv'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                            }`}>
                            {dataSource === 'csv' ? '📄' : '🗃️'}
                            {dataSource === 'csv'
                                ? `CSV: ${uploadedFilename || analysisData.filename || 'imported file'}`
                                : `${analysisData.record_count || 0} Transactions`
                            }
                        </span>
                    </div>
                </div>

                {/* RE-UPLOAD BUTTON */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/5 transition-all duration-300 disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isUploading ? 'Uploading...' : 'Upload New Dataset'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={onFileChange}
                    className="hidden"
                />
            </div>

            {/* GRANULARITY SELECTOR */}
            <div className="mb-6">
                <div className="bg-slate-100 dark:bg-white/5 p-1.5 rounded-[20px] shadow-sm border border-slate-200 dark:border-white/10 flex flex-wrap gap-1">
                    {GRANULARITY_OPTIONS.map((g) => (
                        <button
                            key={g.key}
                            onClick={() => setCsvGranularity(g.key)}
                            className={`px-4 md:px-5 py-2 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${csvGranularity === g.key
                                ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20 scale-105'
                                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-500 hover:bg-amber-500/10 dark:hover:bg-amber-500/5'}`}
                        >
                            {g.label}
                        </button>
                    ))}
                </div>

                {/* CUSTOM DATE PICKERS */}
                {csvGranularity === 'custom' && (
                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white/60 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-shrink-0">From</span>
                        <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-shrink-0">To</span>
                        <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                    </div>
                )}
            </div>

            {isLoading && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Refreshing analysis...</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* MULTI-SERIES CHART */}
                    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Historical vs AI Forecast</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Sales</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Expenses</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Forecast</span></div>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            <Line
                                data={{
                                    labels: [
                                        ...(analysisData.historical?.map(h => h.date) || []),
                                        ...(analysisData.forecast?.sales?.map(f => f.date) || [])
                                    ],
                                    datasets: [
                                        {
                                            label: 'Historical Sales',
                                            data: analysisData.historical?.map(h => h.sales) || [],
                                            borderColor: '#10b981',
                                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                            fill: true,
                                            tension: 0.4,
                                            pointRadius: 3,
                                            borderWidth: 3
                                        },
                                        {
                                            label: 'Historical Expenses',
                                            data: analysisData.historical?.map(h => h.expenses) || [],
                                            borderColor: '#f43f5e',
                                            borderDash: [5, 5],
                                            tension: 0.4,
                                            pointRadius: 0,
                                            borderWidth: 3
                                        },
                                        {
                                            label: 'AI Sales Forecast',
                                            data: [
                                                ...(new Array(analysisData.historical?.length || 0).fill(null)),
                                                ...(analysisData.forecast?.sales?.map(f => f.value) || [])
                                            ],
                                            borderColor: '#f59e0b',
                                            backgroundColor: 'rgba(245, 158, 11, 0.05)',
                                            borderDash: [2, 2],
                                            fill: true,
                                            tension: 0.4,
                                            pointRadius: 4,
                                            pointBackgroundColor: '#f59e0b',
                                            borderWidth: 3
                                        }
                                    ]
                                }}
                                options={{
                                    ...chartOptions,
                                    plugins: { ...chartOptions.plugins, legend: { display: false } }
                                }}
                            />
                        </div>
                    </div>

                    {/* INSIGHTS & SUMMARY */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-500/20 dark:border-emerald-500/10">
                            <h4 className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-4">AI Observations</h4>
                            <ul className="space-y-4">
                                {analysisData.insights?.map((insight, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <span className="mt-1">✨</span> {insight}
                                    </li>
                                ))}
                                {analysisData.total_stats?.margin > 20 && (
                                    <li key="margin-insight" className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <span className="mt-1">📈</span> Healthy margin detected ({analysisData.total_stats.margin.toFixed(1)}%). Business scaling potential is high.
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div className="bg-amber-500/[0.08] dark:bg-amber-500/5 p-8 rounded-[2rem] border border-amber-500/20 dark:border-amber-500/10 flex flex-col justify-center">
                            <p className="text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-[0.2em] mb-2 text-center">Projected Net Profit</p>
                            <p className="text-3xl md:text-4xl font-serif font-black text-slate-900 dark:text-white text-center truncate">
                                {formatINR((analysisData.forecast?.profit?.reduce((acc, curr) => acc + curr.value, 0) || 0))}
                            </p>
                            <p className="text-[10px] text-slate-500 text-center mt-3 font-bold uppercase tracking-widest">Next 8 Periods Cumulative</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* CATEGORY BREAKDOWN (DONUT) */}
                    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                            {dataSource === 'csv' ? 'Import' : 'Transaction'} Analysis
                        </h3>
                        <div className="h-64 relative">
                            <Doughnut
                                data={{
                                    labels: analysisData.category_breakdown?.map(c => c.category) || [],
                                    datasets: [{
                                        data: analysisData.category_breakdown?.map(c => c.amount) || [],
                                        backgroundColor: isDark
                                            ? ['#34d399', '#60a5fa', '#fbbf24', '#fb7185', '#a78bfa', '#f472b6']
                                            : ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                                        borderColor: isDark ? '#1e293b' : '#ffffff',
                                        borderWidth: 2,
                                        cutout: '75%'
                                    }]
                                }}
                                options={{
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 10 }, boxWidth: 8 } } }
                                }}
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Top Spend</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{analysisData.category_breakdown?.[0]?.category || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* QUICK STATS */}
                    <div className="space-y-4">
                        {[
                            { label: dataSource === 'csv' ? "Imported Revenue" : "Total Revenue", value: analysisData.total_stats?.sales, color: "text-emerald-600 dark:text-emerald-400" },
                            { label: dataSource === 'csv' ? "Imported Expenses" : "Total Expenses", value: analysisData.total_stats?.expenses, color: "text-rose-600 dark:text-rose-400" },
                            ...(analysisData.total_stats?.cogs ? [{ label: "Total COGS", value: analysisData.total_stats.cogs, color: "text-orange-600 dark:text-orange-400" }] : []),
                            { label: "Calculated Profit", value: analysisData.total_stats?.profit, color: "text-sky-600 dark:text-sky-400" }
                        ].map((s, i) => (
                            <div key={i} className="bg-white dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</span>
                                <span className={`text-2xl font-serif font-black ${s.color}`}>{formatINR(s.value || 0)}</span>
                            </div>
                        ))}
                    </div>

                    {/* TOP PRODUCTS TABLE */}
                    {analysisData.product_breakdown && analysisData.product_breakdown.length > 0 && (
                        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">🏆 Top Products</h3>
                            <div className="space-y-2">
                                {analysisData.product_breakdown.map((p, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-500/20 text-amber-600' : idx === 1 ? 'bg-slate-300/30 text-slate-500' : idx === 2 ? 'bg-orange-500/20 text-orange-600' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                                }`}>{idx + 1}</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{p.product}</span>
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <span className="text-[10px] font-bold text-slate-400">{p.quantity} sold</span>
                                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatINR(p.revenue)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AiForecast;
