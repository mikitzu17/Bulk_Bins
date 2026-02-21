import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink, Building2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FarmBg from '../assets/farm.jpg';
import Logo from '../assets/logo.png';

const BusinessSelection = () => {
    const { businesses, createBusiness, deleteBusiness, logout, user, setCurrentBusiness } = useAuth();
    const [newBusiness, setNewBusiness] = useState({ name: '', email: '', secondaryEmail: '' });
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreate = async (e) => {
        e.preventDefault();
        if (newBusiness.name.trim()) {
            setLoading(true);
            const biz = await createBusiness({
                name: newBusiness.name,
                email: newBusiness.email,
                secondary_email: newBusiness.secondaryEmail
            });
            setLoading(false);
            if (biz) {
                setNewBusiness({ name: '', email: '', secondaryEmail: '' });
                setIsCreating(false);
                // Don't navigate if pending approval
                if (!biz.status || biz.status === 'approved') {
                    setCurrentBusiness(biz);
                    navigate(`/business/${biz.id}`);
                }
            }
        }
    };

    const handleOpen = (business) => {
        setCurrentBusiness(business);
        navigate(`/business/${business.id}`);
    };

    return (
        <div className="relative w-full min-h-screen flex flex-col items-center bg-slate-950 font-sans selection:bg-primary-500/30 overflow-x-hidden">
            {/* Fixed Immersive Background */}
            <div className="fixed inset-0 z-0">
                <img src={FarmBg} alt="Background" className="w-full h-full object-cover scale-105 opacity-40 blur-[1px]" />
                <div className="absolute inset-0 bg-slate-950/80"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 w-full flex justify-center py-8">
                <div className="w-full max-w-[1200px] flex justify-between items-center px-6">
                    <div className="flex items-center space-x-4">
                        <img src={Logo} alt="Logo" className="w-12 h-12 object-contain rounded-md drop-shadow-[0_10px_30px_rgba(74,222,128,0.2)] animate-float" />
                        <span className="text-3xl font-serif text-white tracking-tighter">BulkBins</span>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="flex flex-col items-end text-right hidden md:flex">
                            <span className="text-white text-xl font-bold">{user?.name}</span>
                            <span className="text-xs text-primary-400 font-black uppercase tracking-[0.2em]">Authorized User</span>
                        </div>
                        <button
                            onClick={logout}
                            className="glass px-7 py-3 rounded-xl text-slate-200 hover:text-white hover:bg-red-500/10 transition-all text-sm uppercase tracking-widest font-black"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 w-full flex flex-col items-center py-12 md:py-20 flex-grow">
                <div className="max-w-[1200px] w-full px-6 flex flex-col items-center">
                    <div className="text-center mb-16 animate-fade-in">
                        <h1 className="text-4xl md:text-6xl font-serif text-white mb-6 tracking-tighter">Authorized Entities</h1>
                        <p className="text-slate-200 text-lg font-bold max-w-2xl mx-auto leading-relaxed">Select a registered business entity to access the management terminal or initialize a new store.</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-8 w-full">
                        {businesses.map((biz) => (
                            <div key={biz.id} className={`glass p-8 rounded-[3rem] transition-all group relative animate-fade-in w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.35rem)] max-w-sm ${biz.status === 'pending' ? 'border-amber-500/20 opacity-80' :
                                biz.status === 'rejected' ? 'border-red-500/20 opacity-60' :
                                    'border-white/5 hover:border-primary-500/30'
                                }`}>
                                <div className="absolute top-8 right-8 flex flex-col items-end space-y-3">
                                    <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.15em] border shadow-lg ${biz.role === 'Owner' ? 'bg-primary-500/20 text-primary-300 border-primary-500/40' :
                                        biz.role === 'Analyst' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                                            'bg-slate-500/20 text-slate-100 border-white/20'
                                        }`}>
                                        {biz.role}
                                    </span>
                                    {biz.status === 'pending' && (
                                        <span className="px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest bg-amber-500/30 text-amber-200 border border-amber-500/50 animate-pulse shadow-lg">
                                            ⏳ Pending Review
                                        </span>
                                    )}
                                    {biz.status === 'rejected' && (
                                        <span className="px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest bg-red-500/30 text-red-200 border border-red-500/50 shadow-lg">
                                            ✕ Declined
                                        </span>
                                    )}
                                </div>

                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-primary-400 mb-8 transition-colors ${biz.status === 'pending' ? 'bg-amber-500/10' :
                                    biz.status === 'rejected' ? 'bg-red-500/10' :
                                        'bg-white/5 group-hover:bg-primary-500/10'
                                    }`}>
                                    <Building2 className={`w-9 h-9 ${biz.status === 'pending' ? 'text-amber-300' :
                                        biz.status === 'rejected' ? 'text-red-300' :
                                            'text-primary-300'
                                        }`} />
                                </div>
                                <h3 className="text-2xl font-serif text-white mb-8 tracking-tight group-hover:translate-x-1.5 transition-transform leading-tight">{biz.name}</h3>

                                <div className="flex items-center gap-5">
                                    {(!biz.status || biz.status === 'approved') ? (
                                        <button
                                            onClick={() => handleOpen(biz)}
                                            className="flex-grow bg-primary-500 text-white py-4.5 rounded-2xl tracking-[0.15em] uppercase text-lg flex items-center justify-center space-x-2 hover:bg-primary-600 transition-all font-black shadow-xl shadow-primary-500/20 hover:scale-[1.02] active:scale-95"
                                        >
                                            <span>Access</span>
                                            <ExternalLink className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <div className={`flex-grow py-5 rounded-3xl tracking-[0.15em] uppercase text-base flex items-center justify-center space-x-2 font-black cursor-not-allowed shadow-inner ${biz.status === 'pending'
                                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                                            : 'bg-red-500/20 text-red-200 border border-red-500/30'
                                            }`}>
                                            <span>{biz.status === 'pending' ? 'Reviewing...' : 'Unauthorized'}</span>
                                        </div>
                                    )}
                                    {biz.role === 'Owner' && (
                                        <button
                                            onClick={() => deleteBusiness(biz.id)}
                                            className="p-5 rounded-3xl bg-white/5 text-slate-300 hover:text-red-400 hover:bg-red-500/20 transition-all border border-white/10 shadow-lg hover:rotate-3"
                                        >
                                            <Trash2 className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isCreating ? (
                            <div className="glass p-8 rounded-[3rem] border-primary-500/50 bg-primary-500/5 animate-scale-in w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.35rem)] max-w-sm">
                                <form onSubmit={handleCreate} className="h-full flex flex-col justify-between">
                                    <div>
                                        <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center text-primary-400 mb-8">
                                            <Plus className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-2xl font-serif text-white mb-6 tracking-tight">New Retail Entity</h3>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Business Name"
                                            value={newBusiness.name}
                                            onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 transition-all mb-4 font-medium"
                                            required
                                        />
                                        <input
                                            type="email"
                                            placeholder="Primary Email"
                                            value={newBusiness.email}
                                            onChange={(e) => setNewBusiness({ ...newBusiness, email: e.target.value })}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 transition-all mb-4 font-medium"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Secondary Email (Optional)"
                                            value={newBusiness.secondaryEmail}
                                            onChange={(e) => setNewBusiness({ ...newBusiness, secondaryEmail: e.target.value })}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 px-6 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/50 transition-all mb-4 font-medium"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-grow bg-primary-500 text-white py-4 rounded-2xl text-lg uppercase tracking-widest disabled:opacity-50 font-medium"
                                        >
                                            {loading ? 'Submitting...' : 'Register'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreating(false);
                                                setNewBusiness({ name: '', email: '', secondaryEmail: '' });
                                            }}
                                            className="bg-white/5 text-slate-400 px-6 rounded-2xl text-lg uppercase tracking-widest hover:bg-white/10 transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="glass p-8 rounded-[3rem] border-dashed border-white/20 hover:border-primary-500/50 transition-all group flex flex-col items-center justify-center text-slate-300 hover:text-primary-400 min-h-[320px] w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.35rem)] max-w-sm shadow-2xl hover:scale-[1.02]"
                            >
                                <div className="p-7 rounded-[1.5rem] bg-white/5 mb-6 group-hover:bg-primary-500/10 transition-all border border-dashed border-white/20 shadow-inner">
                                    <Plus className="w-10 h-10" />
                                </div>
                                <span className="uppercase tracking-[0.2em] text-sm font-black">Register New Entity</span>
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BusinessSelection;
