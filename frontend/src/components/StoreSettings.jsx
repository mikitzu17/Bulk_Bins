import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Trash2, Shield, Settings, Mail, Coins, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import CustomSelect from './CustomSelect';

const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000") + "/api";

export default function StoreSettings({ businessId, theme }) {
    const { token, user, updateProfile, currentBusiness, setCurrentBusiness } = useAuth();
    const [activeSection, setActiveSection] = useState('General');
    const [loading, setLoading] = useState(false);

    // Forms
    const [settingsForm, setSettingsForm] = useState({
        name: '',
        currency: 'INR',
        email: '',
        secondary_email: '',
        logo_url: ''
    });

    const currencyOptions = [
        { value: 'INR', label: 'INR (₹)' },
        { value: 'USD', label: 'USD ($)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'GBP', label: 'GBP (£)' },
        { value: 'JPY', label: 'JPY (¥)' }
    ];

    const roleOptions = ['Staff', 'Analyst', 'Accountant', 'Owner'];

    const [members, setMembers] = useState([]);
    const [inviteForm, setInviteForm] = useState({ email: '', role: 'Staff' });

    const [profileForm, setProfileForm] = useState({
        username: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            setProfileForm({
                username: user.name || '',
                email: user.email || ''
            });
        }
    }, [user]);

    useEffect(() => {
        if (currentBusiness) {
            setSettingsForm({
                name: currentBusiness.name || '',
                currency: currentBusiness.currency || 'INR',
                email: currentBusiness.email || '',
                secondary_email: currentBusiness.secondary_email || '',
                logo_url: currentBusiness.logo_url || ''
            });
            fetchMembers();
        }
    }, [currentBusiness, businessId]);

    const fetchMembers = async () => {
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setMembers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settingsForm)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Settings updated');
                // Update global context
                setCurrentBusiness({ ...currentBusiness, ...settingsForm });
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await updateProfile(profileForm);
        setLoading(false);
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(inviteForm)
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Member added successfully');
                setInviteForm({ email: '', role: 'Staff' });
                fetchMembers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to add member');
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                toast.success('Role updated');
                fetchMembers();
            } else {
                const data = await res.json();
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            const res = await fetch(`${API_URL}/businesses/${businessId}/members/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Member removed');
                fetchMembers();
            } else {
                const data = await res.json();
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to remove member');
        }
    };

    const isDark = theme === 'dark';
    const isOwner = currentBusiness?.role === 'Owner';
    const cardClass = `p-8 rounded-[2.5rem] border ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/50'} transition-all duration-300 relative overflow-hidden`;
    const inputClass = `w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-800'} focus:ring-2 focus:ring-primary-500 transition-all ${!isOwner ? 'opacity-70 cursor-not-allowed' : ''}`;
    const btnClass = `px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 flex items-center gap-2 ${loading || !isOwner ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <div className="glass p-10 space-y-10 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-slate-800 dark:text-slate-100">Store Settings</h1>
                    <p className="text-slate-800 dark:text-slate-100/60 text-xs font-black uppercase tracking-widest mt-2 italic">Configuration & Team Governance</p>
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-100/50 dark:bg-white/5 w-fit border border-slate-200 dark:border-white/10">
                {['General', 'Team', 'Account'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeSection === tab
                            ? 'bg-white dark:bg-slate-800 shadow-xl text-primary-500 scale-[1.02]'
                            : 'text-slate-800 dark:text-slate-100 hover:text-primary-500 dark:hover:text-primary-400'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeSection === 'General' && (
                <div className={cardClass}>
                    <form onSubmit={handleUpdateSettings} className="space-y-8 max-w-4xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Store Name</label>
                                <div className="relative">
                                    <Settings className="absolute left-3 top-3.5 w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    <input
                                        type="text"
                                        value={settingsForm.name}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                                        className={`${inputClass} pl-10`}
                                        required
                                        disabled={!isOwner}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Currency</label>
                                <div className="relative">
                                    <Coins className="absolute left-3 top-3.5 w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    <CustomSelect
                                        value={settingsForm.currency}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                                        options={currencyOptions}
                                        buttonClassName="pl-12"
                                        disabled={!isOwner}
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Primary Contact Email</label>
                                <div className="relative italic font-black">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    <input
                                        type="email"
                                        value={settingsForm.email}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                                        className={`${inputClass} pl-10`}
                                        placeholder="primary@store.com"
                                        disabled={!isOwner}
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Secondary Contact Email</label>
                                <div className="relative italic font-black">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    <input
                                        type="email"
                                        value={settingsForm.secondary_email}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, secondary_email: e.target.value })}
                                        className={`${inputClass} pl-10`}
                                        placeholder="secondary@store.com"
                                        disabled={!isOwner}
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Business Logo URL</label>
                                <div className="relative">
                                    <Settings className="absolute left-3 top-3.5 w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    <input
                                        type="text"
                                        value={settingsForm.logo_url}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                                        className={`${inputClass} pl-10`}
                                        placeholder="https://example.com/logo.png"
                                        disabled={!isOwner}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !isOwner}
                                className={`${btnClass} bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20`}
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            {!isOwner && (
                                <p className="mt-2 text-xs text-amber-500 font-medium">Only owners can modify business settings.</p>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {activeSection === 'Team' && (
                <div className="space-y-8">
                    {/* Invite Member */}
                    <div className={cardClass}>
                        <h3 className="text-xl md:text-2xl font-serif font-black mb-8 flex items-center gap-3 text-slate-800 dark:text-slate-100">
                            <UserPlus className="w-7 h-7 text-primary-500" />
                            Invite New Member
                        </h3>
                        <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 space-y-3 w-full">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className={`${inputClass} italic font-black`}
                                    placeholder="colleague@example.com"
                                    required
                                />
                            </div>
                            <div className="w-full md:w-48 space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Role</label>
                                <CustomSelect
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                    options={roleOptions}
                                />
                            </div>
                            <button
                                type="submit"
                                className={`${btnClass} bg-primary-500 hover:bg-primary-600 text-white shadow-xl shadow-primary-500/20 w-full md:w-auto h-[56px]`}
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Invite</span>
                            </button>
                        </form>
                        <p className="mt-6 text-[10px] text-slate-800 dark:text-slate-100/50 font-black uppercase tracking-widest flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary-500" />
                            User must already be registered on the platform
                        </p>
                    </div>

                    {/* Members List */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black px-2 text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[10px]">Team Members ({members.length})</h3>
                        <div className="grid gap-4">
                            {members.map((member) => (
                                <div key={member.user_id} className={`${cardClass} flex flex-col md:flex-row items-center justify-between gap-6 py-6 shadow-none`}>
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 font-black text-xl">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-serif font-black text-xl text-slate-800 dark:text-slate-100">{member.name}</h4>
                                            <p className="text-slate-800 dark:text-slate-100/60 text-xs font-black uppercase tracking-widest">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="min-w-[140px]">
                                            <CustomSelect
                                                value={member.role}
                                                onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                                                options={roleOptions}
                                                disabled={currentBusiness.role !== 'Owner'}
                                            />
                                        </div>

                                        {currentBusiness.role === 'Owner' && member.email !== user.email && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                className="p-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all active:scale-95"
                                                title="Remove Member"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'Account' && (
                <div className={cardClass}>
                    <h3 className="text-xl md:text-2xl font-serif font-black mb-8 flex items-center gap-3 text-slate-800 dark:text-slate-100">
                        <User className="w-7 h-7 text-primary-500" />
                        Personal Account Settings
                    </h3>
                    <form onSubmit={handleUpdateProfile} className="space-y-8 max-w-4xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    <input
                                        type="text"
                                        value={profileForm.username}
                                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                                        className={`${inputClass} pl-10`}
                                        placeholder="Your full name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100/60 ml-1">Personal Registered Email</label>
                                <div className="relative italic font-black">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-700 dark:text-slate-200" />
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        className={`${inputClass} pl-10`}
                                        placeholder="personal@email.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`${btnClass} bg-primary-500 hover:bg-primary-600 text-white shadow-xl shadow-primary-500/20`}
                            >
                                <Save className="w-5 h-5" />
                                <span>{loading ? 'Updating Profile...' : 'Update Account'}</span>
                            </button>
                            <p className="mt-6 text-[10px] text-slate-800 dark:text-slate-100/50 font-black uppercase tracking-widest italic ml-1">
                                Note: Email changes require logging in again.
                            </p>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
