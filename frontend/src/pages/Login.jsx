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
            {/* Fixed Immersive Background */}
            <div className="fixed inset-0 z-0">
                <img
                    src={FarmBg}
                    alt="Background"
                    className="w-full h-full object-cover scale-105"
                />
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-[440px] animate-fade-in-up">
                <div className="glass p-6 md:p-8 rounded-3xl border-white/10 shadow-3xl text-center relative w-full bg-[#0f172a]/20 backdrop-blur-xl">
                    {/* Interior Back Button */}
                    <Link
                        to="/"
                        className="absolute top-8 left-8 flex items-center space-x-2 text-primary-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back</span>
                    </Link>

                    {/* Brand Header */}
                    <div className="flex flex-col items-center mb-6 mt-1">
                        <img src={Logo} alt="BulkBins Logo" className="w-16 h-16 object-contain rounded-md mb-6 mx-auto drop-shadow-[0_20px_50px_rgba(74,222,128,0.3)] animate-float" />
                        <h1 className="text-3xl font-serif tracking-tighter text-white mb-2 leading-tight">Welcome <br /><span className="text-primary-400 italic">Back</span></h1>
                        <p className="text-slate-400 text-sm font-medium tracking-wide">Sign in to your analytical dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-white/90 font-bold mb-2 block ml-4">Access Identity</label>
                            <div className="relative">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 group-focus-within:text-white transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl py-4 pl-14 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 transition-all font-medium text-sm shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-white/90 font-bold mb-2 block ml-4">Security Key</label>
                            <div className="relative">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-xl py-4 pl-14 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 transition-all font-medium text-sm shadow-inner"
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

                    <div className="mt-6 text-white/50 font-medium text-xs">
                        Don't have an account? <br />
                        <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-bold tracking-wide transition-colors mt-1 inline-block">Create bulk account</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
