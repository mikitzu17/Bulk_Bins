import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Building2,
    LogOut,
    Trash2,
    AlertTriangle,
    Search,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Shield,
    TrendingUp,
    Activity,
    ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import FarmBg from '../assets/farm.jpg';
import Logo from '../assets/logo.png';

const API_URL = 'http://localhost:5000/api';

const MasterAdminDashboard = () => {
    const { token, logout, user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ total_users: 0, total_businesses: 0, pending_businesses: 0, rejected_businesses: 0 });
    const [users, setUsers] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [pendingBusinesses, setPendingBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (!user?.is_master_admin) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [activeTab, user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            if (activeTab === 'overview') {
                const res = await fetch(`${API_URL}/admin/overview`, { headers });
                if (res.ok) setStats(await res.json());
            } else if (activeTab === 'users') {
                const res = await fetch(`${API_URL}/admin/users`, { headers });
                if (res.ok) setUsers(await res.json());
            } else if (activeTab === 'businesses') {
                const res = await fetch(`${API_URL}/admin/businesses`, { headers });
                if (res.ok) setBusinesses(await res.json());
            } else if (activeTab === 'pending') {
                const res = await fetch(`${API_URL}/admin/pending-businesses`, { headers });
                if (res.ok) setPendingBusinesses(await res.json());
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('User deleted');
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to delete user');
            }
        } catch (error) {
            toast.error('Error deleting user');
        }
    };

    const handleDeleteBusiness = async (bizId) => {
        if (!window.confirm('Are you sure you want to delete this business? All data will be lost.')) return;

        try {
            const res = await fetch(`${API_URL}/admin/businesses/${bizId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success('Business deleted');
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to delete business');
            }
        } catch (error) {
            toast.error('Error deleting business');
        }
    };

    const handleApproveBusiness = async (bizId, bizName) => {
        if (!window.confirm(`Approve business "${bizName}"? It will become fully accessible to its owner.`)) return;
        setActionLoading(bizId);
        try {
            const res = await fetch(`${API_URL}/admin/businesses/${bizId}/approve`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success(`✅ "${bizName}" approved successfully!`);
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to approve');
            }
        } catch (error) {
            toast.error('Error approving business');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectBusiness = async (bizId, bizName) => {
        if (!window.confirm(`Reject business "${bizName}"? The owner will not be able to access it.`)) return;
        setActionLoading(bizId);
        try {
            const res = await fetch(`${API_URL}/admin/businesses/${bizId}/reject`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success(`❌ "${bizName}" has been rejected.`);
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to reject');
            }
        } catch (error) {
            toast.error('Error rejecting business');
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredBusinesses = businesses.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'businesses', label: 'Businesses', icon: Building2 },
        { id: 'pending', label: 'Pending Approvals', icon: Clock, badge: stats.pending_businesses },
    ];

    const statCards = [
        { label: 'Total Users', value: stats.total_users, icon: Users, color: 'blue', gradient: 'from-blue-500/20 to-cyan-500/20', iconColor: 'text-blue-400', borderColor: 'border-blue-500/20' },
        { label: 'Approved Businesses', value: stats.total_businesses, icon: Building2, color: 'emerald', gradient: 'from-emerald-500/20 to-green-500/20', iconColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
        { label: 'Pending Approval', value: stats.pending_businesses, icon: Clock, color: 'amber', gradient: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
        { label: 'Rejected', value: stats.rejected_businesses, icon: XCircle, color: 'red', gradient: 'from-red-500/20 to-rose-500/20', iconColor: 'text-red-400', borderColor: 'border-red-500/20' },
    ];

    const getStatusBadge = (status) => {
        const styles = {
            approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${styles[status] || styles.approved}`}>
                {status || 'approved'}
            </span>
        );
    };

    return (
        <div className="relative w-full min-h-screen overflow-x-hidden bg-slate-950 font-sans selection:bg-primary-500/30">

            {/* Immersive Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src={FarmBg}
                    alt="Background"
                    className="w-full h-full object-cover scale-105 opacity-20 animate-slow-zoom"
                />
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 animate-gradient-move"></div>

                {/* Animated Glow Blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-500/8 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-500/8 blur-[120px] rounded-full animate-float"></div>
                <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full animate-pulse"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full">
                {/* Navbar */}
                <nav className="fixed top-0 w-full z-50 py-4 backdrop-blur-md bg-slate-950/40 border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                        <div className="flex items-center space-x-4 group cursor-pointer">
                            <img src={Logo} alt="BulkBins Logo" className="w-10 h-10 object-contain rounded-md drop-shadow-[0_10px_30px_rgba(74,222,128,0.3)] animate-float" />
                            <div className="flex flex-col">
                                <span className="text-2xl font-serif tracking-tighter text-white">BulkBins</span>
                                <span className="text-[8px] font-extrabold uppercase tracking-[0.3em] text-primary-400">Master Control</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="hidden md:flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white text-base font-medium">{user?.name}</span>
                                    <span className="text-xs text-red-400 font-bold uppercase tracking-widest">Master Admin</span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 glass px-6 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-red-500/10 transition-all text-sm uppercase tracking-widest font-bold"
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-6 pt-28 pb-12">
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-3 glass p-2.5 rounded-2xl mb-12 w-fit">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                                className={`relative px-6 py-3.5 rounded-xl text-base font-bold transition-all flex items-center space-x-3 group ${activeTab === tab.id
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span>{tab.label}</span>
                                {tab.badge > 0 && (
                                    <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-black ${activeTab === tab.id
                                        ? 'bg-white/20 text-white'
                                        : 'bg-amber-500/20 text-amber-400 animate-pulse'
                                        }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="animate-fade-in-up">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full"></div>
                                    <RefreshCw className="w-10 h-10 text-primary-400 animate-spin relative z-10" />
                                </div>
                                <p className="text-slate-500 mt-6 text-sm font-medium tracking-wide">Loading data...</p>
                            </div>
                        ) : (
                            <>
                                {/* ========== OVERVIEW TAB ========== */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {statCards.map((card, i) => (
                                                <div key={i} className={`glass p-8 rounded-3xl border ${card.borderColor} hover:scale-[1.03] transition-all duration-300 group cursor-default shadow-2xl`}>
                                                    <div className="flex items-center justify-between mb-5">
                                                        <div className={`p-4 bg-gradient-to-br ${card.gradient} rounded-2xl group-hover:scale-110 transition-transform`}>
                                                            <card.icon className={`w-7 h-7 ${card.iconColor}`} />
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                                                    </div>
                                                    <p className="text-4xl font-serif text-white mb-2 tracking-tight">{card.value}</p>
                                                    <p className="text-xs text-slate-300 uppercase tracking-[0.2em] font-black">{card.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="glass p-10 rounded-3xl border-white/5">
                                            <h3 className="text-xl font-serif text-white mb-8 tracking-tight flex items-center space-x-4">
                                                <Activity className="w-6 h-6 text-primary-400" />
                                                <span>Master Controls</span>
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                {[
                                                    { label: 'View Users', action: () => setActiveTab('users'), icon: Users, color: 'blue' },
                                                    { label: 'Manage Businesses', action: () => setActiveTab('businesses'), icon: Building2, color: 'emerald' },
                                                    { label: 'Review Pending', action: () => setActiveTab('pending'), icon: Clock, color: 'amber', highlight: stats.pending_businesses > 0 },
                                                ].map((item, i) => (
                                                    <button key={i} onClick={item.action} className={`p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 group ${item.highlight ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 shadow-lg shadow-amber-500/5' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                                                        <item.icon className={`w-7 h-7 mb-4 ${item.highlight ? 'text-amber-400' : 'text-slate-200'} group-hover:scale-110 transition-transform`} />
                                                        <span className="text-white font-bold text-base block">{item.label}</span>
                                                        {item.highlight && <span className="mt-2 inline-block px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 text-xs font-black uppercase tracking-wider">{stats.pending_businesses} Actions Required</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ========== USERS TAB ========== */}
                                {activeTab === 'users' && (
                                    <div className="space-y-6">
                                        <div className="relative">
                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search users by name or email..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full glass rounded-2xl py-5 pl-14 pr-8 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500/50 transition-colors text-base font-bold shadow-xl"
                                            />
                                        </div>

                                        <div className="glass rounded-3xl overflow-hidden border-white/5 shadow-2xl">
                                            <table className="w-full text-left">
                                                <thead className="bg-white/5 text-slate-200 text-xs uppercase tracking-[0.2em] font-black border-b border-white/5">
                                                    <tr>
                                                        <th className="p-6">User Identity</th>
                                                        <th className="p-6">Access Level</th>
                                                        <th className="p-6">Store Memberships</th>
                                                        <th className="p-6 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 text-base">
                                                    {filteredUsers.map(u => (
                                                        <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                                                            <td className="p-6">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500/30 to-blue-500/30 flex items-center justify-center text-primary-300 text-base font-black shadow-lg">
                                                                        {u.username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-white text-lg">{u.username}</div>
                                                                        <div className="text-slate-300 text-sm font-medium">{u.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-6">
                                                                {u.is_master_admin ? (
                                                                    <span className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-200 text-xs font-black border border-red-500/40 uppercase tracking-widest shadow-lg shadow-red-500/10">
                                                                        <Shield className="w-4 h-4" />
                                                                        <span>Master Admin</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-200 text-sm font-bold bg-white/5 px-3 py-1 rounded-lg">Standard User</span>
                                                                )}
                                                            </td>
                                                            <td className="p-6">
                                                                <div className="flex flex-wrap gap-2.5">
                                                                    {u.businesses.length > 0 ? u.businesses.map((b, i) => (
                                                                        <span key={i} className="px-3.5 py-1.5 bg-white/10 rounded-full text-xs text-white border border-white/20 font-bold shadow-sm">
                                                                            {b}
                                                                        </span>
                                                                    )) : <span className="text-slate-500 italic text-sm font-medium">No assigned stores</span>}
                                                                </div>
                                                            </td>
                                                            <td className="p-6 text-right">
                                                                {!u.is_master_admin && (
                                                                    <button
                                                                        onClick={() => handleDeleteUser(u.id)}
                                                                        className="p-3 text-slate-300 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all group-hover:opacity-100 opacity-50 shadow-sm"
                                                                        title="Delete User"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredUsers.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-10 text-center text-slate-600 text-sm">No users found</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* ========== BUSINESSES TAB ========== */}
                                {activeTab === 'businesses' && (
                                    <div className="space-y-6">
                                        <div className="relative">
                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search businesses..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full glass rounded-2xl py-5 pl-14 pr-8 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500/50 transition-colors text-base font-bold shadow-xl"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {filteredBusinesses.map(b => (
                                                <div key={b.id} className="glass p-8 rounded-[3rem] border-white/10 hover:border-primary-500/30 transition-all group hover:scale-[1.02] duration-300 shadow-xl">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div>
                                                            <h3 className="text-xl font-serif text-white group-hover:text-primary-400 transition-colors tracking-tight leading-tight">{b.name}</h3>
                                                            <p className="text-slate-300 text-xs mt-2 font-bold uppercase tracking-widest opacity-60">ID: {b.id} • Registered: {b.created_at}</p>
                                                        </div>
                                                        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-primary-500/20 transition-colors shadow-inner">
                                                            <Building2 className="w-6 h-6 text-slate-200 group-hover:text-primary-300 transition-colors" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 mb-8 p-5 bg-white/3 rounded-2xl border border-white/5">
                                                        <div className="flex justify-between items-center text-base">
                                                            <span className="text-slate-300 font-bold text-sm tracking-wide">Deployment</span>
                                                            {getStatusBadge(b.status)}
                                                        </div>
                                                        <div className="flex justify-between items-center text-base">
                                                            <span className="text-slate-300 font-bold text-sm tracking-wide">Operator Count</span>
                                                            <span className="text-white font-black text-lg">{b.member_count}</span>
                                                        </div>
                                                        <div className="flex justify-between items-start text-base">
                                                            <span className="text-slate-300 font-bold text-sm tracking-wide">Control Authority</span>
                                                            <div className="text-right">
                                                                {b.owners.map((o, i) => (
                                                                    <div key={i} className="text-white font-black text-sm">{o}</div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleDeleteBusiness(b.id)}
                                                        className="w-full py-3.5 flex items-center justify-center space-x-3 border-2 border-red-500/30 text-red-300 rounded-2xl hover:bg-red-500/20 transition-all text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span>Terminate Entity</span>
                                                    </button>
                                                </div>
                                            ))}
                                            {filteredBusinesses.length === 0 && (
                                                <div className="col-span-full text-center py-16 text-slate-600 text-sm">No businesses found</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ========== PENDING APPROVALS TAB ========== */}
                                {activeTab === 'pending' && (
                                    <div className="space-y-6">
                                        {pendingBusinesses.length === 0 ? (
                                            <div className="glass rounded-3xl p-16 text-center border-white/5">
                                                <div className="relative inline-block mb-6">
                                                    <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full"></div>
                                                    <CheckCircle2 className="w-16 h-16 text-primary-400 relative z-10" />
                                                </div>
                                                <h3 className="text-2xl font-serif text-white mb-3 tracking-tight">All Clear!</h3>
                                                <p className="text-slate-500 font-medium text-sm">No pending business registrations to review at this time.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="glass p-8 rounded-2xl border-amber-500/30 bg-amber-500/10 flex items-center space-x-5 shadow-lg shadow-amber-500/5">
                                                    <div className="p-3.5 bg-amber-500/20 rounded-xl">
                                                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-black text-lg">
                                                            Action Required: <span className="text-amber-400">{pendingBusinesses.length}</span> registration{pendingBusinesses.length > 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-slate-300 text-sm mt-1 font-medium">Please review and authorize or decline the following entity creation requests.</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {pendingBusinesses.map(b => (
                                                        <div key={b.id} className="glass p-8 rounded-[3rem] border-amber-500/20 hover:border-amber-500/40 transition-all group relative overflow-hidden shadow-2xl">
                                                            {/* Glow Effect */}
                                                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-[80px] rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all"></div>

                                                            <div className="relative z-10">
                                                                <div className="flex justify-between items-start mb-6">
                                                                    <div>
                                                                        <div className="flex items-center space-x-3 mb-3">
                                                                            <span className="px-4 py-1.5 rounded-full bg-amber-500/30 text-amber-200 text-xs font-black uppercase tracking-widest border border-amber-500/40 animate-pulse">
                                                                                Awaiting Review
                                                                            </span>
                                                                        </div>
                                                                        <h3 className="text-2xl font-serif text-white tracking-tight leading-tight">{b.name}</h3>
                                                                        <p className="text-slate-300 text-sm mt-2 font-bold opacity-70">Initiated on {b.created_at}</p>
                                                                    </div>
                                                                    <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                                                        <Building2 className="w-8 h-8 text-amber-400" />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4 mb-8 p-6 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-300 text-sm font-bold uppercase tracking-wide">Primary Owner</span>
                                                                        <span className="text-white font-black text-base">{b.owners.join(', ') || 'Unknown'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-300 text-sm font-bold uppercase tracking-wide">Owner Contact</span>
                                                                        <span className="text-white font-medium text-sm">{b.owner_emails?.join(', ') || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-300 text-sm font-bold uppercase tracking-wide">Initial Staff</span>
                                                                        <span className="text-white font-black text-base">{b.member_count} Members</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-4">
                                                                    <button
                                                                        onClick={() => handleApproveBusiness(b.id, b.name)}
                                                                        disabled={actionLoading === b.id}
                                                                        className="flex-1 py-4 flex items-center justify-center space-x-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl transition-all hover:scale-[1.02] active:scale-95 text-base font-black uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-primary-500/30"
                                                                    >
                                                                        <CheckCircle2 className="w-5 h-5" />
                                                                        <span>Approve</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectBusiness(b.id, b.name)}
                                                                        disabled={actionLoading === b.id}
                                                                        className="flex-1 py-4 flex items-center justify-center space-x-3 border-2 border-red-500/30 text-red-300 rounded-2xl hover:bg-red-500/20 transition-all hover:scale-[1.02] active:scale-95 text-base font-black uppercase tracking-widest disabled:opacity-50 shadow-lg"
                                                                    >
                                                                        <XCircle className="w-5 h-5" />
                                                                        <span>Reject</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-12 border-t border-white/5 relative z-10 bg-slate-950/20 backdrop-blur-sm">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                        <div className="flex items-center space-x-4 mb-4">
                            <img src={Logo} alt="Logo" className="w-10 h-10 object-contain rounded-md opacity-70 group-hover:opacity-100 transition-opacity" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-white font-serif text-xl tracking-tight">BulkBins</span>
                                <span className="text-[10px] text-primary-400 font-black uppercase tracking-[0.3em] mt-1">Master Control Authority</span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm font-medium tracking-wide">
                            Authorized Access Only • System Monitoring Active • {new Date().getFullYear()}
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default MasterAdminDashboard;
