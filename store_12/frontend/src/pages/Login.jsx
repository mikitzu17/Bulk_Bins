import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FarmBg from '../assets/farm.jpg';
import Logo from '../assets/logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(email, password);
        // AuthContext now returns object { success: true, isMasterAdmin: boolean } or false
        if (result && result.success) {
            if (result.isMasterAdmin) {
                navigate('/admin/dashboard');
            } else {
                navigate('/select-business');
            }
        }
    };

    return (
        <div className="relative w-full min-h-screen flex items-center justify-center p-6 bg-slate-950 font-sans selection:bg-primary-500/30 overflow-hidden">
            {/* Full-Screen Background Image with Immersive Overlay */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src={FarmBg}
                    alt="Background"
                    className="w-full h-full object-cover scale-105 opacity-30 dark:opacity-50 transition-opacity duration-300 animate-slow-zoom"
                />
                <div className="absolute inset-0 bg-slate-50/25 dark:bg-slate-950/20 backdrop-blur-none transition-colors duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50/60 via-transparent to-slate-200/20 dark:from-slate-950/80 dark:via-transparent dark:to-slate-950/80 transition-colors duration-300 animate-gradient-move"></div>

                {/* Animated Glow Blobs for Depth */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-500/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-500/10 blur-[120px] rounded-full animate-float"></div>
            </div>

            <div className="relative z-10 w-full max-w-[440px] animate-fade-in-up">
                <div className="glass p-8 md:p-10 relative w-full overflow-hidden">
                    {/* Interior Back Button */}
                    <Link
                        to="/"
                        className="absolute top-8 left-8 flex items-center space-x-2 text-primary-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back</span>
                    </Link>

                    {/* Brand Header */}
                    <div className="flex flex-col items-center mb-8 mt-2">
                        <img src={Logo} alt="BulkBins Logo" className="w-16 h-16 object-contain rounded-md mb-6 mx-auto drop-shadow-[0_20px_50px_rgba(74,222,128,0.3)] animate-float" />
                        <h1 className="text-4xl font-serif font-black tracking-tighter text-slate-900 dark:text-white mb-3 leading-tight">Welcome <br /><span className="text-primary-500 italic">Back</span></h1>
                        <p className="text-slate-900 dark:text-white text-sm font-medium tracking-wide opacity-80">Sign in to your analytical dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-slate-900 dark:text-white font-black mb-2 block ml-4">Access Identity</label>
                            <div className="relative">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 group-focus-within:scale-110 transition-all" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-6 pl-14 py-4 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all font-medium text-sm shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-slate-900 dark:text-white font-black mb-2 block ml-4">Security Key</label>
                            <div className="relative">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 group-focus-within:scale-110 transition-all" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-6 pl-14 py-4 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all font-medium text-sm shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary-500 text-white py-4 rounded-xl text-lg font-medium hover:bg-primary-600 transition-all hover:scale-[1.02] active:scale-95 shadow-xl flex items-center justify-center space-x-3 group"
                        >
                            <span>Initialize Session</span>
                            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-8 text-slate-900 dark:text-white font-medium text-xs opacity-80">
                        Don't have an account? <br />
                        <Link to="/signup" className="text-primary-500 hover:text-primary-600 font-black tracking-wide transition-colors mt-2 inline-block">Create bulk account</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
