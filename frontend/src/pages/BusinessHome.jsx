import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Package, ArrowLeft, BarChart3, TrendingUp, DollarSign, Plus, AlertCircle, Wand2, ArrowRight, Sun, Moon, LogOut, Download, Upload, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/formatCurrency';
import ProfitLossDashboard from '../components/ProfitLossDashboard';
import AdvancedAnalytics from '../components/AdvancedAnalytics';
import Dashboard from '../components/AiDashboard';
import AiForecast from '../components/AiForecast';
import StoreSettings from '../components/StoreSettings';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import ExportModal from '../components/ExportModal';
import Logo from '../assets/logo.png';

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";

const BusinessHome = () => {
    const { id } = useParams();
    const { businesses, currentBusiness, setCurrentBusiness, logout, token, user } = useAuth();
    const [activeTab, setActiveTab] = useState('Overview');
    const [pnlData, setPnlData] = useState([]);
    const [aiPredictions, setAiPredictions] = useState(null);
    const [isClassifying, setIsClassifying] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Staff');
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isEditingRole, setIsEditingRole] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItem, setNewItem] = useState({
        name: '',
        stock_quantity: 0,
        selling_price: 0,
        cost_price: 0,
        reorder_level: 5,
        category: 'Produce',
        description: '',
        lead_time: 7
    });
    const [transactions, setTransactions] = useState([]);
    const [isAddingTransaction, setIsAddingTransaction] = useState(false);
    const [isEditingTransaction, setIsEditingTransaction] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [transactionForm, setTransactionForm] = useState({
        amount: '',
        category: 'Produce',
        type: 'Sale',
        description: '',
        inventory_item_id: '',
        quantity: '',
        timestamp: new Date().toISOString().split('T')[0]
    });
    const [inventoryInsights, setInventoryInsights] = useState(null);
    const [profitInsights, setProfitInsights] = useState([]);
    const [receiptFile, setReceiptFile] = useState(null);
    const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);
    const [overviewMode, setOverviewMode] = useState('Premium'); // Premium or Simple
    const [inventorySearch, setInventorySearch] = useState('');

    // Pagination state
    const [transactionPage, setTransactionPage] = useState(1);
    const transactionsPerPage = 10;
    const [inventoryPages, setInventoryPages] = useState({
        Produce: 1,
        Bakery: 1,
        Dairy: 1,
        Meat: 1,
        Others: 1
    });
    const itemsPerPage = 5;

    // Report frequency state
    const [reportGranularity, setReportGranularity] = useState('monthly');
    const [pnlCustomStart, setPnlCustomStart] = useState('');
    const [pnlCustomEnd, setPnlCustomEnd] = useState('');

    const navigate = useNavigate();

    // Theme Logic
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === "dark" ? "light" : "dark");
    };

    useEffect(() => {
        console.log("BusinessHome: Checking access...", { user, businesses, id });

        if (user?.is_master_admin) {
            console.log("BusinessHome: Redirecting Master Admin to dashboard");
            navigate('/admin/dashboard');
            return;
        }

        if (!businesses || businesses.length === 0) {
            console.log("BusinessHome: No businesses found, redirecting to selection");
            // Wait for businesses to load or redirect if truly empty
            // Since loading is handled by ProtectedRoute, if we are here and businesses is empty, 
            // the user has no businesses.
            navigate('/select-business');
            return;
        }

        const biz = businesses.find(b => b.id.toString() === id.toString());
        if (biz) {
            console.log("BusinessHome: Business found, setting current");
            setCurrentBusiness(biz);
        } else {
            console.log("BusinessHome: Business ID not found in user memberships");
            // Business ID not found in user's membership list
            navigate('/select-business');
        }

        // Safety timeout
        const timer = setTimeout(() => {
            if (!currentBusiness) {
                console.warn("BusinessHome: Stuck in loading state, forcing redirect");
                navigate('/select-business');
            }
        }, 5000);

        return () => clearTimeout(timer);

    }, [id, businesses, navigate, setCurrentBusiness, user]);

    useEffect(() => {
        if (currentBusiness) {
            fetchInventory();
            fetchTransactions();

            // Fetch AI data if needed

            if (activeTab === 'Analytics' || activeTab === 'Overview') {
                fetchAiData();
            }
            if (activeTab === 'Staff') {
                fetchMembers();
            }
        }
    }, [activeTab, currentBusiness]);

    const fetchInventory = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setInventory(data);
        } catch (error) {
            toast.error('Failed to fetch inventory');
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/transactions?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                // Handle both array (legacy) and paginated object (new)
                const txns = Array.isArray(data) ? data : (data.transactions || []);
                setTransactions(txns);
            }
        } catch (error) {
            toast.error('Failed to fetch transactions');
        }
    };

    const fetchMembers = async () => {
        setIsLoadingMembers(true);
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setMembers(data);
        } catch (error) {
            toast.error('Failed to fetch team members');
        }
        setIsLoadingMembers(false);
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/members/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Member removed');
                fetchMembers();
            } else {
                const err = await response.json();
                toast.error(err.message || 'Failed to remove member');
            }
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    const handleUpdateRole = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/members/${editingMember.user_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: inviteRole })
            });
            if (response.ok) {
                toast.success('Role updated');
                setIsEditingRole(false);
                setEditingMember(null);
                fetchMembers();
            } else {
                const err = await response.json();
                toast.error(err.message || 'Failed to update role');
            }
        } catch (error) {
            toast.error('Failed to update role');
        }
        setLoading(false);
    };



    const fetchAiData = async () => {
        try {
            const [pnlRes, predRes, insightRes, starRes] = await Promise.all([
                fetch(`http://localhost:5000/api/businesses/${id}/ai/pnl`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`http://localhost:5000/api/businesses/${id}/ai/predictions`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`http://localhost:5000/api/businesses/${id}/ai/inventory-insights`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`http://localhost:5000/api/businesses/${id}/ai/profit-stars`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (pnlRes.ok) setPnlData(await pnlRes.json());
            if (predRes.ok) setAiPredictions(await predRes.json());
            if (insightRes.ok) setInventoryInsights(await insightRes.json());
            if (starRes.ok) setProfitInsights(await starRes.json());
        } catch (error) {
            console.error('Failed to fetch AI data');
        }
    };

    const fileInputRef = useRef(null); // For AI Prediction tab CSV upload
    const fileInputRefExport = useRef(null); // Renamed to avoid logic conflict
    const importInputRef = useRef(null);
    const [showExportModal, setShowExportModal] = useState(false);

    // Import Functionality
    const handleImportCSV = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading("Importing transactions...");

        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/transaction-import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message, { id: toastId });
                fetchTransactions(); // Refresh data
            } else {
                toast.error(data.message || "Import failed", { id: toastId });
            }
        } catch (error) {
            toast.error("Network error during import", { id: toastId });
            console.error(error);
        }
        // Reset input
        e.target.value = null;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading('Importing transactions...');

        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/transaction-import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message, { id: toastId });
                // Refresh data
                fetchTransactions();
                fetchAiData();
            } else {
                toast.error(data.message || 'Import failed', { id: toastId });
            }
        } catch (error) {
            toast.error('Network error during import', { id: toastId });
        }

        // Reset input
        e.target.value = null;
    };

    const handleImportTransactions = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const toastId = toast.loading('Importing transactions...');
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/transaction-import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(`Imported ${data.count} transactions!`, { id: toastId });
                fetchTransactions();
                // Also refresh AI stats if possible
            } else {
                toast.error(data.error || 'Import failed', { id: toastId });
            }
        } catch (error) {
            console.error('Import Error:', error);
            toast.error('Network error during import', { id: toastId });
        }

        // Reset file input
        e.target.value = null;
    };

    const handleAutoClassify = async () => {
        if (!transactionForm.description) {
            toast.error('Please enter a description first');
            return;
        }
        setIsClassifying(true);
        try {
            const response = await fetch(`${API_URL}/ai/classify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ description: transactionForm.description })
            });
            const data = await response.json();
            if (response.ok) {
                setTransactionForm(prev => ({ ...prev, category: data.suggestion }));
                toast.success(`AI suggested: ${data.suggestion}`);
            }
        } catch (error) {
            toast.error('AI classification failed');
        }
        setIsClassifying(false);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/inventory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newItem)
            });
            if (response.ok) {
                toast.success('Item added to inventory');
                setIsAddingItem(false);
                setNewItem({
                    name: '',
                    stock_quantity: 0,
                    selling_price: 0,
                    cost_price: 0,
                    reorder_level: 5,
                    category: 'Produce',
                    lead_time: 1
                });
                fetchInventory();
            } else {
                const err = await response.json();
                console.warn('Inventory Add Error:', err);
                toast.error(err.message || 'Check your permissions or data types');
            }
        } catch (error) {
            console.error('Add Item Exception:', error);
            toast.error('Network error. Check if backend is running.');
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        Object.keys(transactionForm).forEach(key => {
            formData.append(key, transactionForm[key]);
        });

        // Add metadata for AI Analysis (Profit calculation etc.)
        if (transactionForm.type === 'Sale' && transactionForm.inventory_item_id) {
            const item = inventory.find(i => i.id.toString() === transactionForm.inventory_item_id?.toString());
            if (item) {
                const metadata = {
                    cost_price_at_time: item.cost_price,
                    selling_price_at_time: item.selling_price,
                    calculated_profit: parseFloat(transactionForm.amount) - (item.cost_price * transactionForm.quantity),
                    current_stock_before: item.stock_quantity
                };
                formData.append('metadata', JSON.stringify(metadata));
            }
        }

        if (receiptFile) {
            formData.append('receipt', receiptFile);
        }

        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/transactions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (response.ok) {
                toast.success('Transaction recorded');
                setIsAddingTransaction(false);
                setTransactionForm({ amount: '', category: 'Produce', type: 'Sale', description: '', inventory_item_id: '', quantity: '', timestamp: new Date().toISOString().split('T')[0] });
                setReceiptFile(null);
                fetchTransactions();
                fetchInventory(); // Refresh inventory stock
            } else {
                const err = await response.json();
                toast.error(err.message || 'Failed to record transaction');
            }
        } catch (error) {
            toast.error('Failed to record transaction');
        }
    };

    const handleUpdateTransaction = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        Object.keys(transactionForm).forEach(key => {
            formData.append(key, transactionForm[key]);
        });

        if (receiptFile) {
            formData.append('receipt', receiptFile);
        }

        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/transactions/${editingTransaction.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (response.ok) {
                toast.success('Transaction updated');
                setIsEditingTransaction(false);
                setEditingTransaction(null);
                setTransactionForm({ amount: '', category: 'Produce', type: 'Sale', description: '', inventory_item_id: '', quantity: '', timestamp: new Date().toISOString().split('T')[0] });
                setReceiptFile(null);
                fetchTransactions();
                fetchInventory(); // Refresh inventory stock
            } else {
                const err = await response.json();
                toast.error(err.message || 'Failed to update transaction');
            }
        } catch (error) {
            toast.error('Failed to update transaction');
        }
    };

    const handleDeleteTransaction = async (transactionId) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/transactions/${transactionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success('Transaction deleted');
                fetchTransactions();
                fetchInventory(); // Refresh inventory stock after sale deletion
            }
        } catch (error) {
            toast.error('Failed to delete transaction');
        }
    };

    const handleRestock = async (item, additionalQty) => {
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${id}/inventory/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ stock_quantity: item.stock_quantity + additionalQty })
            });
            if (response.ok) {
                toast.success('Stock updated');
                fetchInventory();
            }
        } catch (error) {
            toast.error('Failed to restock');
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/businesses/${currentBusiness.id}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole })
            });
            const data = await response.json();
            if (response.ok) {
                toast.success('Team member added');
                setIsInviting(false);
                setInviteEmail('');
                fetchMembers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to send invite');
        }
        setLoading(false);
    };

    if (!currentBusiness) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h2 className="text-2xl font-serif text-white">Initializing Terminal...</h2>
                <p className="text-slate-500 mt-2">Connecting to business ledger</p>
            </div>
        </div>
    );

    const role = currentBusiness.role;

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', roles: ['Owner', 'Accountant', 'Analyst', 'Staff'] },
        { icon: BarChart3, label: 'Analytics', roles: ['Owner', 'Accountant', 'Analyst'] },
        { icon: Wand2, label: 'AI Prediction', roles: ['Owner', 'Analyst'] },
        { icon: Package, label: 'Inventory', roles: ['Owner', 'Accountant', 'Staff'] },
        { icon: DollarSign, label: 'Transactions', roles: ['Owner', 'Accountant', 'Analyst', 'Staff'] },
        { icon: Settings, label: 'Settings', roles: ['Owner', 'Accountant', 'Analyst', 'Staff'] }
    ].filter(item => item.roles.includes(role));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex font-sans transition-colors duration-300">
            {/* Modal for Role Editing */}
            {isEditingRole && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-[3px]" onClick={() => setIsEditingRole(false)}></div>
                    <div className="glass p-10 rounded-[3rem] border-primary-500/30 w-full max-w-lg relative z-10 animate-scale-in">
                        <h2 className="text-3xl font-serif text-slate-900 dark:text-white mb-2">Change Role</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8">Update management access for <b>{editingMember?.name}</b></p>
                        <form onSubmit={handleUpdateRole} className="space-y-6">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">New Access Role</label>
                                <CustomSelect
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    options={[
                                        { value: 'Staff', label: 'Staff' },
                                        { value: 'Accountant', label: 'Accountant' },
                                        { value: 'Analyst', label: 'Analyst' },
                                        { value: 'Owner', label: 'Co-Owner' }
                                    ]}
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-grow bg-primary-500 hover:bg-primary-600 text-white text-lg py-4 rounded-xl transition-all uppercase tracking-widest disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Update Role'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingRole(false)}
                                    className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-6 py-4 rounded-xl text-lg uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isInviting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-[3px]" onClick={() => setIsInviting(false)}></div>
                    <div className="glass p-10 rounded-[3rem] border-primary-500/30 w-full max-w-lg relative z-10 animate-scale-in">
                        <h2 className="text-3xl font-serif text-slate-900 dark:text-white mb-8">Add Team Member</h2>
                        <form onSubmit={handleInvite} className="space-y-6">
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Email Address</label>
                                <input
                                    autoFocus
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 transition-all font-bold text-sm"
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Access Role</label>
                                <CustomSelect
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    options={[
                                        { value: 'Staff', label: 'Staff' },
                                        { value: 'Accountant', label: 'Accountant' },
                                        { value: 'Analyst', label: 'Analyst' },
                                        { value: 'Owner', label: 'Co-Owner' }
                                    ]}
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-grow bg-primary-500 hover:bg-primary-600 text-white text-lg py-4 rounded-xl transition-all uppercase tracking-widest disabled:opacity-50"
                                >
                                    {loading ? 'Adding...' : 'Add Member'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsInviting(false)}
                                    className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-6 py-4 rounded-xl text-lg uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal for Adding Transaction */}
            {isAddingTransaction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-[3px]" onClick={() => setIsAddingTransaction(false)}></div>
                    <div className="glass p-10 rounded-[3rem] border-primary-500/30 w-full max-w-4xl relative z-10 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-serif text-slate-900 dark:text-white">Record New Transaction</h2>
                            <button onClick={() => setIsAddingTransaction(false)} className="text-slate-500 hover:text-white transition-colors">
                                <Plus className="w-8 h-8 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleAddTransaction} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Type</label>
                                    <CustomSelect
                                        value={transactionForm.type}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            setTransactionForm({
                                                ...transactionForm,
                                                type,
                                                category: type === 'Sale' ? 'Produce' : 'Rent',
                                                inventory_item_id: '',
                                                amount: ''
                                            });
                                        }}
                                        options={['Sale', 'Expense']}
                                    />
                                </div>

                                {transactionForm.type === 'Sale' ? (
                                    <>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Category</label>
                                            <CustomSelect
                                                value={transactionForm.category}
                                                onChange={(e) => {
                                                    setTransactionForm({
                                                        ...transactionForm,
                                                        category: e.target.value,
                                                        inventory_item_id: '',
                                                        amount: ''
                                                    });
                                                }}
                                                options={['Produce', 'Bakery', 'Dairy', 'Meat', 'Others']}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Product</label>
                                            <CustomSelect
                                                value={transactionForm.inventory_item_id}
                                                onChange={(e) => {
                                                    const itemId = e.target.value?.toString();
                                                    const item = inventory.find(i => i.id.toString() === itemId);
                                                    const qty = parseInt(transactionForm.quantity) || 0;
                                                    setTransactionForm({
                                                        ...transactionForm,
                                                        inventory_item_id: itemId,
                                                        amount: (item && qty > 0) ? item.selling_price * qty : '',
                                                    });
                                                }}
                                                placeholder="Select Item"
                                                options={[
                                                    ...inventory
                                                        .filter(item => item.category === transactionForm.category)
                                                        .map(item => ({
                                                            value: item.id,
                                                            label: `${item.name} (Stock: ${item.stock_quantity})`
                                                        }))
                                                ]}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Quantity</label>
                                            <input
                                                type="number"
                                                value={transactionForm.quantity}
                                                min="1"
                                                placeholder="Enter quantity"
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const qty = val === '' ? '' : parseInt(val);
                                                    const item = inventory.find(i => i.id.toString() === transactionForm.inventory_item_id?.toString());
                                                    setTransactionForm({
                                                        ...transactionForm,
                                                        quantity: qty,
                                                        amount: (item && qty > 0) ? item.selling_price * qty : ''
                                                    });
                                                }}
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-lg focus:border-primary-500/50 transition-all font-serif"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Category</label>
                                        <CustomSelect
                                            value={transactionForm.category}
                                            onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                                            options={['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Insurance', 'Taxes', 'Maintenance', 'Others']}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Reason / Description</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={transactionForm.type === 'Sale' ? "Optional notes (e.g. Bulk discount applied)" : "e.g. Monthly rent, Electricity bill"}
                                            value={transactionForm.description}
                                            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-lg focus:border-primary-500/50 transition-all font-serif pr-16"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAutoClassify}
                                            className="absolute right-3 top-3 p-3 bg-primary-500/10 text-primary-400 rounded-xl hover:bg-primary-500/20 transition-all"
                                            title="AI Auto-Classify"
                                            disabled={isClassifying}
                                        >
                                            <Wand2 className={`w-5 h-5 ${isClassifying ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Date</label>
                                        <input
                                            type="date"
                                            value={transactionForm.timestamp}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setTransactionForm({ ...transactionForm, timestamp: e.target.value })}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold"
                                            required
                                        />
                                    </div>
                                    {transactionForm.type === 'Sale' && transactionForm.inventory_item_id && (() => {
                                        const selectedItem = inventory.find(i => i.id.toString() === transactionForm.inventory_item_id?.toString());
                                        return selectedItem ? (
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Unit Selling Price</label>
                                                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl py-4 px-6 flex items-center justify-between">
                                                    <span className="text-emerald-600 dark:text-emerald-400 text-2xl font-serif font-black">₹{selectedItem.selling_price}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">per unit</span>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">
                                        Final Amount (₹)
                                        {transactionForm.type === 'Sale' && transactionForm.inventory_item_id && transactionForm.quantity && (
                                            <span className="ml-2 text-emerald-500 text-[9px] font-bold">⚡ Auto-calculated</span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Enter amount"
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-lg focus:border-primary-500/50 transition-all font-serif"
                                        value={transactionForm.amount}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Receipt (Optional)</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setReceiptFile(e.target.files[0])}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary-500/10 file:text-primary-500 file:font-bold file:text-xs file:uppercase file:tracking-widest file:cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-4 pt-4">
                                <button type="submit" className="flex-grow bg-primary-500 text-white py-5 rounded-2xl text-lg uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 font-black hover:bg-primary-600 transition-all active:scale-95">
                                    Finalize Entry
                                </button>
                                <button type="button" onClick={() => setIsAddingTransaction(false)} className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-10 py-5 rounded-2xl text-lg uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-20 md:w-72 flex flex-col items-center md:items-stretch p-3 md:p-4 gap-3 shrink-0 bg-slate-100/50 dark:bg-slate-950/50 h-screen sticky top-0 overflow-hidden">

                {/* Pill 1: Logo */}
                <div className="shrink-0 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 px-4 py-4 flex items-center space-x-3 shadow-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                        <img src={Logo} alt="Logo" className="w-8 h-8 object-contain rounded-md drop-shadow-[0_5px_15px_rgba(74,222,128,0.4)]" />
                    </div>
                    <span className="text-xl font-serif tracking-tighter hidden md:block text-slate-900 dark:text-white">BulkBins</span>
                </div>

                {/* Pill 2: Navigation */}
                <div className="flex-grow bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 p-2 md:p-3 shadow-sm overflow-y-auto no-scrollbar">
                    <nav className="space-y-1">
                        {navItems.map((item, i) => {
                            const isInventory = item.label === 'Inventory';
                            const lowStockCount = isInventory ? inventory.filter(p => p.stock_quantity <= (p.reorder_level || 5)).length : 0;

                            return (
                                <button
                                    key={i}
                                    id={isInventory ? 'inventory-tab-btn' : undefined}
                                    onClick={() => setActiveTab(item.label)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === item.label
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <item.icon className="w-5 h-5" />
                                        <span className="text-sm font-semibold hidden md:block">{item.label}</span>
                                    </div>
                                    {isInventory && lowStockCount > 0 && (
                                        <span className="w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-rose-500/40">
                                            {lowStockCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Pill 3: Profile */}
                <div className="shrink-0 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 p-3 md:p-4 shadow-sm">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 flex items-center justify-center shrink-0">
                            <span className="text-primary-600 dark:text-primary-400 text-sm font-black">
                                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                            </span>
                        </div>
                        <div className="hidden md:block min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-primary-500 dark:text-primary-400">{role}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all text-xs font-bold"
                        >
                            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            <span className="hidden md:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                        </button>
                        <button
                            onClick={logout}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/20 transition-all text-xs font-bold"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden md:inline">Sign Out</span>
                        </button>
                    </div>
                </div>

            </aside>

            {/* Main Content */}
            <main className="flex-grow overflow-y-scroll no-scrollbar scrollbar-gutter-stable">
                <div className={`max-w-[1200px] mx-auto p-6 md:p-12 w-full ${activeTab === 'Settings' ? '-translate-x-[8px]' : ''}`}>
                    <header className="flex items-center justify-between gap-6 mb-4">
                        <div>
                            <div className="flex items-center space-x-3 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${role === 'Owner' ? 'bg-primary-500/10 text-primary-400 border-primary-500/20' :
                                    role === 'Analyst' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        'bg-slate-500/10 text-slate-400 border-white/10'
                                    }`}>
                                    {role}
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-serif tracking-tighter text-slate-900 dark:text-white truncate">
                                {currentBusiness.name}
                            </h1>
                        </div>
                    </header>

                    {activeTab === 'Overview' && (
                        <div className="animate-in fade-in duration-500">
                            <Dashboard businessId={id} theme={theme} />
                        </div>
                    )}

                    {activeTab === 'Analytics' && (
                        <div className="space-y-12 pb-24">
                            {/* AI Insights Bar */}
                            {aiPredictions && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="glass p-6 rounded-2xl border-primary-500/20 bg-primary-500/5">
                                        <div className="text-primary-400 text-[10px] font-black uppercase tracking-widest mb-1">7-Day Forecast</div>
                                        <div className="text-2xl font-serif text-slate-900 dark:text-white">{formatINR(aiPredictions.predictions['7_day'])}</div>
                                    </div>
                                    <div className="glass p-6 rounded-2xl border-blue-500/20 bg-blue-500/5">
                                        <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">30-Day Forecast</div>
                                        <div className="text-2xl font-serif text-slate-900 dark:text-white">{formatINR(aiPredictions.predictions['30_day'])}</div>
                                    </div>
                                    {aiPredictions.overspending.alert && (
                                        <div className="glass p-6 rounded-2xl border-red-500/30 bg-red-500/10 col-span-1 md:col-span-2 flex items-center space-x-4 animate-pulse">
                                            <div className="p-3 bg-red-500/20 rounded-2xl text-red-500 dark:text-red-400">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-red-500 dark:text-red-400 text-[10px] font-black uppercase tracking-widest">Overspending Alert</div>
                                                <div className="text-sm text-slate-600 dark:text-white/80">Current spending is {formatINR(aiPredictions.overspending.excess_amount)} above average.</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* P&L Dashboard */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                                <div>
                                    {!showAdvancedAnalytics && (
                                        <>
                                            <h2 className="text-2xl md:text-3xl font-serif text-slate-900 dark:text-white mb-2">Profit & Loss</h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">Visualizing your financial health for the last 6 months.</p>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
                                    className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center space-x-3 transition-all border border-slate-200 dark:border-white/10"
                                >
                                    {showAdvancedAnalytics ? (
                                        <>
                                            <ArrowLeft className="w-4 h-4" />
                                            <span>Back to Dashboard</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Advanced Analytics</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* P&L Dashboard */}
                            <div className="glass p-8 md:p-12 rounded-2xl border-slate-200 dark:border-white/5">

                                {/* Report Frequency Toggle */}
                                {!showAdvancedAnalytics && pnlData && pnlData.length > 0 && (
                                    <div className="mb-8">
                                        <div className="bg-slate-100 dark:bg-white/5 p-1.5 rounded-[20px] shadow-sm border border-slate-200 dark:border-white/10 flex flex-wrap gap-1">
                                            {[
                                                { key: 'daily', label: 'Daily' },
                                                { key: 'weekly', label: 'Weekly' },
                                                { key: 'monthly', label: 'Monthly' },
                                                { key: 'quarterly', label: 'Quarterly' },
                                                { key: 'halfyearly', label: 'Half-Year' },
                                                { key: 'yearly', label: 'Yearly' },
                                                { key: 'custom', label: '📅 Custom' },
                                            ].map((g) => (
                                                <button
                                                    key={g.key}
                                                    onClick={() => setReportGranularity(g.key)}
                                                    className={`px-4 md:px-5 py-2 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${reportGranularity === g.key
                                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-500 hover:bg-primary-500/10 dark:hover:bg-primary-500/5'
                                                        }`}
                                                >
                                                    {g.label}
                                                </button>
                                            ))}
                                        </div>
                                        {reportGranularity === 'custom' && (
                                            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white/60 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-shrink-0">From</span>
                                                <input type="date" value={pnlCustomStart} onChange={(e) => setPnlCustomStart(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex-shrink-0">To</span>
                                                <input type="date" value={pnlCustomEnd} onChange={(e) => setPnlCustomEnd(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {showAdvancedAnalytics ? (
                                    <AdvancedAnalytics businessId={id} onClose={() => setShowAdvancedAnalytics(false)} theme={theme} />
                                ) : (
                                    <ProfitLossDashboard data={pnlData} theme={theme} reportGranularity={reportGranularity} customStart={pnlCustomStart} customEnd={pnlCustomEnd} />
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'AI Prediction' && (
                        <div className="pb-24">
                            <AiForecast businessId={id} token={token} theme={theme} />
                        </div>
                    )}

                    {activeTab === 'Inventory' && (
                        <div className="space-y-12 pb-24">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white">Inventory Management</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Centralized Asset Ledger</p>
                                </div>
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, category…"
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white font-semibold placeholder:text-slate-400 focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/10 transition-all"
                                    />
                                    {inventorySearch && (
                                        <button
                                            onClick={() => setInventorySearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                        >
                                            <Plus className="w-4 h-4 rotate-45" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Add/Edit Product Form */}
                            {(role === 'Owner' || role === 'Accountant') && (
                                <div className="glass p-8 md:p-10 rounded-2xl border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -mr-32 -mt-32"></div>
                                    <div className="flex justify-between items-center mb-8 relative">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-400">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-serif text-slate-900 dark:text-white">{isEditingItem ? 'Edit Product' : 'Add New Item'}</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-[9px] uppercase tracking-widest font-black">Configure item specifications</p>
                                            </div>
                                        </div>
                                        {isEditingItem && (
                                            <button
                                                onClick={() => {
                                                    setIsEditingItem(false);
                                                    setEditingItem(null);
                                                    setNewItem({ name: '', stock_quantity: 0, selling_price: 0, cost_price: 0, reorder_level: 5, category: 'Produce', description: '', lead_time: 7 });
                                                }}
                                                className="text-xs text-slate-500 hover:text-white uppercase tracking-widest font-bold transition-colors"
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const method = isEditingItem ? 'PUT' : 'POST';
                                        const url = isEditingItem
                                            ? `http://localhost:5000/api/businesses/${id}/inventory/${editingItem.id}`
                                            : `http://localhost:5000/api/businesses/${id}/inventory`;

                                        try {
                                            const response = await fetch(url, {
                                                method,
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify(newItem)
                                            });
                                            if (response.ok) {
                                                toast.success(isEditingItem ? 'Product updated!' : 'Product added!');
                                                setIsEditingItem(false);
                                                setEditingItem(null);
                                                setNewItem({ name: '', stock_quantity: 0, selling_price: 0, cost_price: 0, reorder_level: 5, category: 'Produce', description: '', lead_time: 7 });
                                                fetchInventory();
                                            } else {
                                                const err = await response.json();
                                                toast.error(err.message || 'Action failed');
                                            }
                                        } catch (error) {
                                            toast.error('Network error');
                                        }
                                    }} className="grid grid-cols-1 md:grid-cols-6 gap-6 relative">
                                        <div className="md:col-span-2">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Product Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Organic Tomatoes"
                                                className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold"
                                                value={newItem.name}
                                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Category</label>
                                            <CustomSelect
                                                value={newItem.category}
                                                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                                options={['Produce', 'Bakery', 'Dairy', 'Meat', 'Others']}
                                            />
                                        </div>

                                        <div className="md:col-span-3">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Description</label>
                                            <input
                                                type="text"
                                                placeholder="Brief details..."
                                                className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold"
                                                value={newItem.description || ''}
                                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Selling Price</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm font-bold focus:border-primary-500/50 transition-all"
                                                value={newItem.selling_price}
                                                onChange={(e) => setNewItem({ ...newItem, selling_price: parseFloat(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Cost Price</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm font-bold focus:border-primary-500/50 transition-all"
                                                value={newItem.cost_price}
                                                onChange={(e) => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Stock (Qty)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm font-bold focus:border-primary-500/50 transition-all"
                                                value={newItem.stock_quantity}
                                                onChange={(e) => setNewItem({ ...newItem, stock_quantity: parseInt(e.target.value) || 0 })}
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Min Alert</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm font-bold focus:border-primary-500/50 transition-all"
                                                value={newItem.reorder_level}
                                                onChange={(e) => setNewItem({ ...newItem, reorder_level: parseInt(e.target.value) || 5 })}
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Lead (Days)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm font-bold focus:border-primary-500/50 transition-all"
                                                value={newItem.lead_time || 7}
                                                onChange={(e) => setNewItem({ ...newItem, lead_time: parseInt(e.target.value) || 7 })}
                                            />
                                        </div>

                                        <div className="md:col-span-1 flex items-end">
                                            <button type="submit" className="w-full bg-primary-500 text-white py-[1.1rem] rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 font-black hover:bg-primary-600 transition-all active:scale-[0.98]">
                                                {isEditingItem ? 'Update' : 'Add Item'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Section Wrapper */}
                            {[
                                { title: 'Produce Market', icon: '🥦', filter: (p) => p.category === 'Produce', key: 'Produce' },
                                { title: 'Artisanal Bakery', icon: '🥖', filter: (p) => p.category === 'Bakery', key: 'Bakery' },
                                { title: 'Dairy & Farm', icon: '🥛', filter: (p) => p.category === 'Dairy', key: 'Dairy' },
                                { title: 'Meat & Seafood', icon: '🥩', filter: (p) => p.category === 'Meat', key: 'Meat' },
                                { title: 'Other Essentials', icon: '📦', filter: (p) => !['Produce', 'Bakery', 'Dairy', 'Meat'].includes(p.category), key: 'Others' }
                            ].map((section, idx) => {
                                const searchTerm = inventorySearch.toLowerCase().trim();
                                const products = inventory.filter(p => {
                                    if (!section.filter(p)) return false;
                                    if (!searchTerm) return true;
                                    return p.name?.toLowerCase().includes(searchTerm) ||
                                        p.category?.toLowerCase().includes(searchTerm) ||
                                        p.description?.toLowerCase().includes(searchTerm);
                                });
                                const currentPage = inventoryPages[section.key] || 1;
                                const totalPages = Math.ceil(products.length / itemsPerPage);
                                const paginatedProducts = products.slice(
                                    (currentPage - 1) * itemsPerPage,
                                    currentPage * itemsPerPage
                                );

                                return (
                                    <div key={idx} className="space-y-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-xl border-slate-200 dark:border-white/5">
                                                {section.icon}
                                            </div>
                                            <h3 className="text-3xl font-serif text-slate-900 dark:text-white">{section.title}</h3>
                                        </div>

                                        <div className="glass rounded-2xl border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/5">
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Item Details</th>
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Financials</th>
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Performance</th>
                                                        <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Availability</th>
                                                        {(role === 'Owner' || role === 'Accountant') && (
                                                            <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.02]">
                                                    {paginatedProducts.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="p-20 text-center text-slate-500 dark:text-slate-600 font-serif italic text-lg opacity-50">
                                                                No catalog entries found for this section...
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        paginatedProducts.map(item => (
                                                            <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors border-slate-200 dark:border-white/5">
                                                                <td className="p-8">
                                                                    <div className="flex items-center space-x-3 mb-1">
                                                                        <div className="text-xl font-serif text-slate-900 dark:text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">{item.name}</div>
                                                                        {item.stock_quantity <= (item.reorder_level || 5) && (
                                                                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse">Low Stock</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest line-clamp-1">{item.description || item.category}</div>
                                                                </td>
                                                                <td className="p-8">
                                                                    <div className="text-xl font-serif text-primary-400 mb-1">{formatINR(item.selling_price)}</div>
                                                                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Basic Cost: {formatINR(item.cost_price || 0)}</div>
                                                                </td>
                                                                <td className="p-8">
                                                                    <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">{formatINR(item.selling_price - (item.cost_price || 0))} Profit</div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">ROI:</span>
                                                                        <span className={`text-[10px] font-black ${item.cost_price > 0 && (item.selling_price - item.cost_price) / item.cost_price > 0.5 ? 'text-green-400' : 'text-slate-400'}`}>
                                                                            {item.cost_price > 0 ? (((item.selling_price - item.cost_price) / item.cost_price) * 100).toFixed(0) : '0'}%
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-8">
                                                                    <div className="flex flex-col space-y-2">
                                                                        <div className="flex items-center space-x-3">
                                                                            <div className="w-20 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full transition-all duration-1000 ${item.stock_quantity > item.reorder_level ? 'bg-primary-500' : 'bg-red-500'}`}
                                                                                    style={{ width: `${Math.min(100, (item.stock_quantity / Math.max(1, item.reorder_level * 3)) * 100)}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className={`text-xs font-black ${item.stock_quantity > item.reorder_level ? 'text-primary-400' : 'text-red-500'}`}>
                                                                                {item.stock_quantity}
                                                                            </span>
                                                                        </div>
                                                                        {item.stock_quantity <= item.reorder_level && (
                                                                            <div className="flex items-center space-x-2 text-rose-500 animate-pulse">
                                                                                <AlertCircle className="w-3 h-3" />
                                                                                <span className="text-[8px] font-black uppercase tracking-widest">Restock Required</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                {(role === 'Owner' || role === 'Accountant') && (
                                                                    <td className="p-8 text-right">
                                                                        <div className="flex justify-end space-x-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingItem(item);
                                                                                    setIsEditingItem(true);
                                                                                    setNewItem({
                                                                                        name: item.name,
                                                                                        category: item.category,
                                                                                        description: item.description || '',
                                                                                        selling_price: item.selling_price,
                                                                                        cost_price: item.cost_price || 0,
                                                                                        stock_quantity: item.stock_quantity,
                                                                                        reorder_level: item.reorder_level || 5,
                                                                                        lead_time: item.lead_time || 7
                                                                                    });
                                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                                }}
                                                                                className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-xl transition-all"
                                                                            >
                                                                                <Settings className="w-4 h-4" />
                                                                            </button>
                                                                            {role === 'Owner' && (
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        if (!confirm('Archive this item from inventory?')) return;
                                                                                        try {
                                                                                            const response = await fetch(`http://localhost:5000/api/businesses/${id}/inventory/${item.id}`, {
                                                                                                method: 'DELETE',
                                                                                                headers: { 'Authorization': `Bearer ${token}` }
                                                                                            });
                                                                                            if (response.ok) {
                                                                                                toast.success('Item archived');
                                                                                                fetchInventory();
                                                                                            }
                                                                                        } catch (e) { toast.error('Archiving failed'); }
                                                                                    }}
                                                                                    className="p-3 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                                                                >
                                                                                    <Plus className="w-4 h-4 rotate-45" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>

                                            {/* Category Pagination */}
                                            {products.length > itemsPerPage && (
                                                <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                                                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, products.length)} of {products.length} items
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => setInventoryPages({ ...inventoryPages, [section.key]: Math.max(1, currentPage - 1) })}
                                                            disabled={currentPage === 1}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                                        >
                                                            Prev
                                                        </button>
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                                                            {currentPage} / {totalPages}
                                                        </div>
                                                        <button
                                                            onClick={() => setInventoryPages({ ...inventoryPages, [section.key]: Math.min(totalPages, currentPage + 1) })}
                                                            disabled={currentPage === totalPages}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'Transactions' && (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white">Financial Ledger</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Live Transaction Stream</p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {role !== 'Analyst' && (
                                        <>
                                            {/* Export Button */}
                                            <button
                                                onClick={() => setShowExportModal(true)}
                                                className="bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 flex items-center space-x-3"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>Export</span>
                                            </button>

                                            {/* Import Button */}
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept=".csv"
                                                    ref={importInputRef}
                                                    onChange={handleImportCSV}
                                                    className="hidden"
                                                />
                                                <button
                                                    onClick={() => importInputRef.current.click()}
                                                    className="bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 px-6 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] font-black hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 flex items-center space-x-3"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    <span>Import</span>
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {role !== 'Analyst' && (
                                        <button
                                            onClick={() => setIsAddingTransaction(true)}
                                            className="bg-primary-500 text-white px-8 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 font-black hover:bg-primary-600 transition-all active:scale-95 flex items-center space-x-3"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>New Transaction</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                {(() => {
                                    const totalPages = Math.ceil(transactions.length / transactionsPerPage);
                                    const paginatedTransactions = transactions.slice(
                                        (transactionPage - 1) * transactionsPerPage,
                                        transactionPage * transactionsPerPage
                                    );

                                    return (
                                        <>
                                            {paginatedTransactions.map(txn => (
                                                <div key={txn.id} className="glass p-6 rounded-2xl border-slate-200 dark:border-white/5 flex items-center justify-between hover:border-slate-300 dark:hover:border-white/10 transition-colors group">
                                                    <div className="flex items-center space-x-6">
                                                        <div className={`p-4 rounded-2xl ${txn.type === 'Sale' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                            {txn.type === 'Sale' ? <TrendingUp className="w-6 h-6" /> : <TrendingUp className="w-6 h-6 rotate-180" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-slate-900 dark:text-white text-lg font-medium">{txn.description || txn.category}</div>
                                                            <div className="text-slate-500 text-xs font-medium uppercase tracking-widest flex items-center">
                                                                {new Date(txn.timestamp).toLocaleDateString()} • {txn.category}
                                                                {txn.receipt_url && (
                                                                    <div className="flex items-center ml-4 space-x-3">
                                                                        <a href={`http://localhost:5000${txn.receipt_url}`} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">View</a>
                                                                        <span className="text-slate-700">|</span>
                                                                        <a href={`http://localhost:5000${txn.receipt_url}`} download className="text-primary-400 hover:underline">Download</a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-6">
                                                        <div className="text-right mr-4">
                                                            <div className={`text-2xl font-serif ${txn.type === 'Sale' ? 'text-green-400' : 'text-red-400'}`}>
                                                                {txn.type === 'Sale' ? '+' : '-'}{formatINR(txn.amount)}
                                                            </div>
                                                            {txn.profit !== undefined && (
                                                                <div className={`text-[10px] font-bold uppercase tracking-widest ${txn.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    Profit: {txn.profit >= 0 ? '+' : '-'}{formatINR(Math.abs(txn.profit))}
                                                                </div>
                                                            )}
                                                            {txn.type === 'Sale' && txn.quantity > 1 && (
                                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Qty: {txn.quantity}</div>
                                                            )}
                                                        </div>
                                                        {(role === 'Owner' || role === 'Accountant') && (
                                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingTransaction(txn);
                                                                        setTransactionForm({
                                                                            amount: txn.amount,
                                                                            category: txn.category,
                                                                            type: txn.type,
                                                                            inventory_item_id: txn.inventory_item_id || '',
                                                                            quantity: txn.quantity || 1,
                                                                            timestamp: new Date(txn.timestamp).toISOString().split('T')[0]
                                                                        });
                                                                        setIsEditingTransaction(true);
                                                                    }}
                                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                                >
                                                                    <Settings className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTransaction(txn.id)}
                                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                                >
                                                                    <Plus className="w-4 h-4 rotate-45" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {paginatedTransactions.length === 0 && (
                                                <div className="py-20 text-center opacity-30">
                                                    <DollarSign className="w-16 h-16 mx-auto mb-4" />
                                                    <p className="font-bold uppercase tracking-widest text-xs">No transactions recorded yet</p>
                                                </div>
                                            )}

                                            {/* Pagination Controls */}
                                            {transactions.length > transactionsPerPage && (
                                                <div className="glass p-6 rounded-2xl border-slate-200 dark:border-white/5 flex items-center justify-between mt-6">
                                                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                        Showing {((transactionPage - 1) * transactionsPerPage) + 1}-{Math.min(transactionPage * transactionsPerPage, transactions.length)} of {transactions.length} transactions
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                                                            disabled={transactionPage === 1}
                                                            className="px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                                        >
                                                            Previous
                                                        </button>
                                                        <div className="flex space-x-1">
                                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                                                <button
                                                                    key={pageNum}
                                                                    onClick={() => setTransactionPage(pageNum)}
                                                                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${pageNum === transactionPage
                                                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                                                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    {pageNum}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            onClick={() => setTransactionPage(p => Math.min(totalPages, p + 1))}
                                                            disabled={transactionPage === totalPages}
                                                            className="px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {isEditingTransaction && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                                    <div className="absolute inset-0 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setIsEditingTransaction(false)}></div>
                                    <div className="glass p-10 rounded-2xl border-primary-500/30 w-full max-w-4xl relative z-10 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
                                        <div className="flex justify-between items-center mb-8">
                                            <h2 className="text-3xl font-serif text-slate-900 dark:text-white">Revise Transaction</h2>
                                            <button onClick={() => setIsEditingTransaction(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <Plus className="w-8 h-8 rotate-45" />
                                            </button>
                                        </div>
                                        <form onSubmit={handleUpdateTransaction} className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Type</label>
                                                    <CustomSelect
                                                        value={transactionForm.type}
                                                        onChange={(e) => {
                                                            const type = e.target.value;
                                                            setTransactionForm({
                                                                ...transactionForm,
                                                                type,
                                                                category: type === 'Sale' ? 'Produce' : 'Rent',
                                                                inventory_item_id: '',
                                                                amount: ''
                                                            });
                                                        }}
                                                        options={['Sale', 'Expense']}
                                                    />
                                                </div>

                                                {transactionForm.type === 'Sale' ? (
                                                    <>
                                                        <div>
                                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Category</label>
                                                            <CustomSelect
                                                                value={transactionForm.category}
                                                                onChange={(e) => {
                                                                    setTransactionForm({
                                                                        ...transactionForm,
                                                                        category: e.target.value,
                                                                        inventory_item_id: '',
                                                                        amount: ''
                                                                    });
                                                                }}
                                                                options={['Produce', 'Bakery', 'Dairy', 'Meat', 'Others']}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Product</label>
                                                            <CustomSelect
                                                                value={transactionForm.inventory_item_id}
                                                                onChange={(e) => {
                                                                    const itemId = e.target.value;
                                                                    const item = inventory.find(i => i.id.toString() === itemId);
                                                                    setTransactionForm({
                                                                        ...transactionForm,
                                                                        inventory_item_id: itemId,
                                                                        amount: item ? item.selling_price * transactionForm.quantity : '',
                                                                    });
                                                                }}
                                                                placeholder="Select Item"
                                                                options={[
                                                                    ...inventory
                                                                        .filter(item => item.category === transactionForm.category)
                                                                        .map(item => ({
                                                                            value: item.id,
                                                                            label: `${item.name} (Stock: ${item.stock_quantity})`
                                                                        }))
                                                                ]}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Quantity</label>
                                                            <input
                                                                type="number"
                                                                value={transactionForm.quantity}
                                                                min="1"
                                                                onChange={(e) => {
                                                                    const qty = parseInt(e.target.value) || 1;
                                                                    const item = inventory.find(i => i.id.toString() === transactionForm.inventory_item_id);
                                                                    setTransactionForm({
                                                                        ...transactionForm,
                                                                        quantity: qty,
                                                                        amount: item ? item.selling_price * qty : transactionForm.amount
                                                                    });
                                                                }}
                                                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-lg focus:border-primary-500/50 transition-all font-serif"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div>
                                                        <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Category</label>
                                                        <CustomSelect
                                                            value={transactionForm.category}
                                                            onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                                                            options={['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Insurance', 'Taxes', 'Maintenance', 'Others']}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Reason / Description</label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            placeholder={transactionForm.type === 'Sale' ? "Optional notes (e.g. Bulk discount applied)" : "e.g. Monthly rent, Electricity bill"}
                                                            value={transactionForm.description}
                                                            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-lg focus:border-primary-500/50 transition-all font-serif pr-16"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleAutoClassify}
                                                            className="absolute right-3 top-3 p-3 bg-primary-500/10 text-primary-400 rounded-xl hover:bg-primary-500/20 transition-all"
                                                            title="AI Auto-Classify"
                                                            disabled={isClassifying}
                                                        >
                                                            <Wand2 className={`w-5 h-5 ${isClassifying ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Manual Date Selection</label>
                                                    <input
                                                        type="date"
                                                        value={transactionForm.timestamp}
                                                        max={new Date().toISOString().split('T')[0]}
                                                        onChange={(e) => setTransactionForm({ ...transactionForm, timestamp: e.target.value })}
                                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Final Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-lg focus:border-primary-500/50 transition-all font-serif"
                                                        value={transactionForm.amount}
                                                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-widest text-primary-400 font-black mb-3 block ml-4">Update Receipt (Optional)</label>
                                                    <input
                                                        type="file"
                                                        onChange={(e) => setReceiptFile(e.target.files[0])}
                                                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl py-3 px-6 text-slate-900 dark:text-white text-sm focus:border-primary-500/50 transition-all font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex space-x-4 pt-4">
                                                <button type="submit" className="flex-grow bg-primary-500 text-white py-5 rounded-2xl text-lg uppercase tracking-[0.2em] shadow-xl shadow-primary-500/20 font-black hover:bg-primary-600 transition-all active:scale-95">
                                                    Update Financial Record
                                                </button>
                                                <button type="button" onClick={() => setIsEditingTransaction(false)} className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-10 py-5 rounded-2xl text-lg uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )
                            }

                            {/* Export Modal trigger logic remains in button, component moved to root */}
                        </div>
                    )}

                    {activeTab === 'Staff' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-3xl font-serif text-slate-900 dark:text-white">Business Team</h2>
                                    <p className="text-slate-500 dark:text-slate-400">Manage access and roles for your organization</p>
                                </div>
                                {role === 'Owner' && (
                                    <button
                                        onClick={() => setIsInviting(true)}
                                        className="bg-primary-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all flex items-center space-x-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Member</span>
                                    </button>
                                )}
                            </div>

                            {isLoadingMembers ? (
                                <div className="p-12 text-center glass rounded-3xl">
                                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-slate-500">Loading team...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {members.map((member) => (
                                        <div key={member.user_id} className="glass p-8 rounded-[2.5rem] border-slate-200 dark:border-white/5 group hover:border-primary-500/30 transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl -mr-16 -mt-16"></div>

                                            <div className="flex items-center space-x-4 mb-6 relative z-10">
                                                <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 font-black text-xl">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-serif text-xl text-slate-900 dark:text-white">{member.name}</h3>
                                                    <p className="text-slate-500 text-xs truncate max-w-[150px]">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col space-y-4 relative z-10">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Current Role</span>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${member.role === 'Owner' ? 'bg-primary-500/20 text-primary-500' :
                                                        member.role === 'Accountant' ? 'bg-blue-500/20 text-blue-500' :
                                                            'bg-slate-500/20 text-slate-500'
                                                        }`}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Joined</span>
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{member.joined_at}</span>
                                                </div>
                                            </div>

                                            {role === 'Owner' && member.email !== user.email && (
                                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex space-x-3 relative z-10">
                                                    <button
                                                        onClick={() => {
                                                            setEditingMember(member);
                                                            setInviteRole(member.role);
                                                            setIsEditingRole(true);
                                                        }}
                                                        className="flex-grow bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                                                    >
                                                        Edit Role
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveMember(member.user_id)}
                                                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {members.length === 0 && (
                                        <div className="col-span-full p-20 text-center glass rounded-[3rem] border-dashed border-slate-300 dark:border-white/10">
                                            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4 opacity-20" />
                                            <p className="text-slate-500 font-serif text-xl italic">No team members found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'Settings' && (
                        <div className="space-y-8">
                            <StoreSettings businessId={id} theme={theme} />
                        </div>
                    )}
                </div>
            </main >

            {/* Export Modal - Moved to root for better stacking/blur coverage */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                businessId={id}
                businessName={currentBusiness?.name || 'Business'}
            />
        </div >
    );
};

export default BusinessHome;


