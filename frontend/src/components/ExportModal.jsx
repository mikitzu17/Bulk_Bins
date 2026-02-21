import React, { useState } from 'react';
import { X, Download, Mail, FileText, Table, FileSpreadsheet, Calendar, Clock, Check, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import CustomSelect from './CustomSelect';

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";

const ExportModal = ({ isOpen, onClose, businessId, businessName }) => {
    const [formats, setFormats] = useState(['pdf', 'excel']);
    const [timeframe, setTimeframe] = useState('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isEmailing, setIsEmailing] = useState(false);

    if (!isOpen) return null;

    const toggleFormat = (id) => {
        setFormats(prev => {
            if (prev.includes(id)) {
                // Prevent deselecting the last one
                if (prev.length === 1) return prev;
                return prev.filter(f => f !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const getDateRange = () => {
        const now = new Date();
        let start = null;
        let end = now.toISOString().split('T')[0];

        switch (timeframe) {
            case '7days':
                start = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case '30days':
                start = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case '90days':
                start = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                break;
            case 'custom':
                start = customStart || null;
                end = customEnd || end;
                break;
            default:
                start = null;
                end = null;
        }
        return { start, end };
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        const toastId = toast.loading('Generating reports...');
        try {
            const { start, end } = getDateRange();
            const token = localStorage.getItem('token');

            // Loop through selected formats and download each
            for (const fmt of formats) {
                let url = `${API_URL}/businesses/${businessId}/export/transactions?format=${fmt}`;
                if (start) url += `&start_date=${start}`;
                if (end) url += `&end_date=${end}`;

                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!response.ok) throw new Error(`Failed to export ${fmt.toUpperCase()}`);

                const blob = await response.blob();
                const ext = fmt === 'excel' ? 'xlsx' : fmt;
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${businessName}_report.${ext}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);

                // Small delay between downloads
                await new Promise(r => setTimeout(r, 500));
            }

            toast.success('Reports downloaded!', { id: toastId });
        } catch (err) {
            toast.error('Failed to generate report', { id: toastId });
            console.error(err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleEmail = async () => {
        setIsEmailing(true);
        const toastId = toast.loading('Sending reports to your email...');
        try {
            const { start, end } = getDateRange();
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/businesses/${businessId}/export/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    formats, // Send array
                    start_date: start,
                    end_date: end
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Email failed');

            //toast.success(`Reports sent to ${data.email}!`, { id: toastId });
            toast.success(data.message || `Reports sent successfully!`, { id: toastId });
        } catch (err) {
            toast.error(err.message || 'Failed to send email', { id: toastId });
            console.error(err);
        } finally {
            setIsEmailing(false);
        }
    };

    const availableFormats = [
        { id: 'csv', label: 'CSV', desc: 'Spreadsheet-compatible', icon: Table },
        { id: 'excel', label: 'Excel', desc: 'Multi-sheet workbook', icon: FileSpreadsheet },
        { id: 'pdf', label: 'PDF', desc: 'Charts & details', icon: FileText },
    ];

    const timeframes = [
        { id: '7days', label: 'Last 7 Days' },
        { id: '30days', label: 'Last 30 Days' },
        { id: '90days', label: 'Last 90 Days' },
        { id: 'all', label: 'All Time' },
        { id: 'custom', label: 'Custom Range' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with stronger blur */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] transition-all duration-300" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative px-8 pt-8 pb-4">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-green-600 to-primary-700" />
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">Export Report</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select formats and time period</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="px-8 pb-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Format Selection - Multi Select */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 block">
                            File Formats
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {availableFormats.map(f => {
                                const isSelected = formats.includes(f.id);
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => toggleFormat(f.id)}
                                        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-center group
                                            ${isSelected
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-lg shadow-primary-500/10'
                                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/5'
                                            }`}
                                    >
                                        {isSelected && (
                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <f.icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-primary-500' : 'text-slate-400'}`} />
                                        <div className={`text-sm font-bold ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {f.label}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{f.desc}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Frame Selection - Dropdown */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 block">
                            Time Period
                        </label>
                        <div className="relative">
                            <CustomSelect
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                options={timeframes.map(tf => ({ value: tf.id, label: tf.label }))}
                                placeholder="Select time period"
                            />
                        </div>

                        {/* Custom Date Range */}
                        {timeframe === 'custom' && (
                            <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={e => setCustomStart(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={e => setCustomEnd(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PDF info badge */}
                    {formats.includes('pdf') && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-50 dark:bg-primary-500/5 border border-primary-200 dark:border-primary-500/20">
                            <FileText className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-primary-700 dark:text-primary-400">
                                <span className="font-bold">PDF includes:</span> Financial summary, Profit/Loss charts, Income vs Expenses trends, Expense breakdown pie chart, and full transaction details table.
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || isEmailing}
                            className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-primary-500 text-white font-bold text-sm shadow-xl shadow-primary-500/20 hover:bg-primary-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span>{isDownloading ? 'Downloading...' : `Download ${formats.length > 1 ? 'All' : ''}`}</span>
                        </button>
                        <button
                            onClick={handleEmail}
                            disabled={isDownloading || isEmailing}
                            className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-900 dark:bg-white/10 text-white font-bold text-sm shadow-xl hover:bg-slate-800 dark:hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isEmailing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Mail className="w-4 h-4" />
                            )}
                            <span>{isEmailing ? 'Sending...' : 'Email Report'}</span>
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                        Email will be sent to your registered account email address
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
