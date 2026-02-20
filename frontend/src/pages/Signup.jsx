import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FarmBg from '../assets/farm.jpg';
import Logo from '../assets/logo.png';
import toast from 'react-hot-toast';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        const success = await signup(formData);
        if (success) navigate('/select-business');
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
                <div className="glass p-10 md:p-12 rounded-3xl border-white/10 shadow-3xl text-center relative w-full bg-[#0f172a]/20 backdrop-blur-xl">
                    {/* Interior Back Button */}
                    <Link
                        to="/"
                        className="absolute top-6 left-6 flex items-center space-x-2 text-primary-400 hover:text-white transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back</span>
                    </Link>

                    {/* Brand Header */}
                    <div className="flex flex-col items-center mb-6 mt-1">
                        <img src={Logo} alt="Logo" className="w-12 h-12 object-contain rounded-md mb-4 drop-shadow-[0_20px_50px_rgba(74,222,128,0.3)] animate-float" />
                        <h1 className="text-3xl font-serif tracking-tighter text-white mb-2 leading-tight">Partner <br /><span className="text-primary-400 italic">Registration</span></h1>
                        <p className="text-slate-400 text-sm font-medium tracking-wide">Initialize your intelligence platform</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-white/90 font-bold mb-2 block ml-4">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 group-focus-within:text-white transition-colors" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter your name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 transition-all font-medium text-sm shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-white/90 font-bold mb-2 block ml-4">Corporate Gmail</label>
                            <div className="relative">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 group-focus-within:text-white transition-colors" />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="name@gmail.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 transition-all font-medium text-sm shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-white/90 font-bold mb-2 block ml-4">Secure Password</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 transition-all font-medium text-sm shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <div className="relative group text-left">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-white/90 font-bold mb-2 block ml-4">Confirm Password</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 group-focus-within:text-white transition-colors" />
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-primary-500 transition-all font-medium text-sm shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary-500 text-white py-5 rounded-2xl text-xl font-medium hover:bg-primary-600 transition-all hover:scale-[1.02] active:scale-95 shadow-xl flex items-center justify-center space-x-3 group mt-4"
                        >
                            <span>Register Identity</span>
                            <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-8 text-white/50 font-medium text-xs">
                        Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-bold tracking-wide transition-colors mt-2 inline-block">Sign in here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
