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
    const cardClass = `p-8 rounded-3xl ${isDark ? 'bg-slate-900/50 border border-white/5' : 'bg-white border border-slate-100'} shadow-xl transition-all duration-300`;
    const inputClass = `w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} focus:ring-2 focus:ring-primary-500 transition-all ${!isOwner ? 'opacity-70 cursor-not-allowed' : ''}`;
    const btnClass = `px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${loading || !isOwner ? 'opacity-50 cursor-not-allowed' : ''}`;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white">Store Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Manage your business profile and team members</p>
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="flex gap-4 p-2 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 w-fit">
                {['General', 'Team', 'Account'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${activeSection === tab
                            ? 'bg-white dark:bg-slate-700 shadow-md text-primary-500'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeSection === 'General' && (
                <div className={cardClass}>
                    <form onSubmit={handleUpdateSettings} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Store Name</label>
                                <div className="relative">
                                    <Settings className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
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

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Currency</label>
                                <div className="relative">
                                    <Coins className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <CustomSelect
                                        value={settingsForm.currency}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                                        options={currencyOptions}
                                        buttonClassName="pl-12"
                                        disabled={!isOwner}
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-slate-400">Primary Contact Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
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

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-slate-400">Secondary Contact Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
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

                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-slate-400">Business Logo URL</label>
                                <div className="relative">
                                    <Settings className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
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
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <UserPlus className="w-6 h-6 text-primary-400" />
                            Invite New Member
                        </h3>
                        <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2 w-full">
                                <label className="text-sm font-medium text-slate-400">Email Address</label>
                                <input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className={inputClass}
                                    placeholder="colleague@example.com"
                                    required
                                />
                            </div>
                            <div className="w-full md:w-48 space-y-2">
                                <label className="text-sm font-medium text-slate-400">Role</label>
                                <CustomSelect
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                    options={roleOptions}
                                />
                            </div>
                            <button
                                type="submit"
                                className={`${btnClass} bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 w-full md:w-auto h-[50px]`}
                            >
                                <UserPlus className="w-5 h-5" />
                                Invite
                            </button>
                        </form>
                        <p className="mt-4 text-sm text-slate-400 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            User must already be registered on the platform to be added.
                        </p>
                    </div>

                    {/* Members List */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold px-2">Team Members ({members.length})</h3>
                        <div className="grid gap-4">
                            {members.map((member) => (
                                <div key={member.user_id} className={`${cardClass} flex flex-col md:flex-row items-center justify-between gap-6 py-6`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-lg">{member.name}</h4>
                                            <p className="text-slate-400 text-sm">{member.email}</p>
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

                                        {currentBusiness.role === 'Owner' && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                className="p-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 transition-colors"
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
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                        <User className="w-6 h-6 text-primary-400" />
                        Personal Account Settings
                    </h3>
                    <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={profileForm.username}
                                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                                        className={`${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} w-full px-4 py-3 rounded-xl border pl-10 focus:ring-2 focus:ring-primary-500 transition-all`}
                                        placeholder="Your full name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Personal Registered Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                        className={`${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} w-full px-4 py-3 rounded-xl border pl-10 focus:ring-2 focus:ring-primary-500 transition-all`}
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
                                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Updating Profile...' : 'Update Account'}
                            </button>
                            <p className="mt-4 text-xs text-slate-400 italic">
                                Note: Changing your email will require you to log in with the new email next time.
                            </p>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
