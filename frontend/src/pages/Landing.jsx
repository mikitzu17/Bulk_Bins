import React, { useState, useEffect } from 'react';
import { TrendingUp, ShieldCheck, PieChart, Users, ArrowRight, CheckCircle2, BarChart3, Box, LineChart, Cpu, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardPreview from '../components/DashboardPreview';
import StoreImage from '../assets/pexels-syah-indra-180442700-11547378.jpg';
import FarmBg from '../assets/farm.jpg';
import Logo from '../assets/logo.png';

const Landing = () => {
    return (
        <div className="relative w-full min-h-screen overflow-x-hidden bg-slate-950 font-sans selection:bg-primary-500/30">


            {/* Full-Screen Background Image with Immersive Overlay (Hero Only) */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src={FarmBg}
                    alt="Supermarket Background"
                    className="w-full h-full object-cover scale-105 opacity-30 dark:opacity-50 transition-opacity duration-300 animate-slow-zoom"
                />
                <div className="absolute inset-0 bg-slate-50/25 dark:bg-slate-950/20 backdrop-blur-none transition-colors duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50/60 via-transparent to-slate-200/20 dark:from-slate-950/80 dark:via-transparent dark:to-slate-950/80 transition-colors duration-300 animate-gradient-move"></div>

                {/* Animated Glow Blobs for Depth */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-500/10 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-500/10 blur-[120px] rounded-full animate-float"></div>
            </div>

            <div className="relative z-10 w-full">
                {/* Navbar */}
                <nav className="fixed top-0 w-full z-50 py-6 backdrop-blur-[1px] transition-all duration-300">
                    <div className="max-w-[1240px] mx-auto px-6 md:px-12 flex justify-between items-center">
                        <div className="flex items-center space-x-4 md:space-x-5 group cursor-pointer">
                            <img src={Logo} alt="BulkBins Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain rounded-md drop-shadow-[0_20px_50px_rgba(74,222,128,0.3)] animate-float" />
                            <div className="flex flex-col space-y-1">
                                <span className="text-3xl md:text-5xl font-serif tracking-tighter text-slate-900 dark:text-white">BulkBins</span>
                                <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-[0.3em] text-white mt-1 md:mt-2">Sales & Profit Analyzer</span>
                            </div>
                        </div>
                        <div className="hidden lg:flex space-x-6 items-center text-[10px] md:text-xs font-black uppercase tracking-widest">
                            <a href="#preview" className="bg-slate-200/50 dark:bg-white/5 hover:bg-slate-300/80 dark:hover:bg-white/10 text-slate-900 dark:text-slate-300 px-6 py-3 rounded-full border border-slate-900/10 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-sm">
                                Preview
                            </a>
                            <Link to="/login" className="bg-slate-200/50 dark:bg-white/5 hover:bg-slate-300/80 dark:hover:bg-white/10 text-slate-900 dark:text-slate-300 px-6 py-3 rounded-full border border-slate-900/10 dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-sm">
                                Login
                            </Link>
                            <Link to="/signup" className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-full shadow-2xl shadow-primary-500/40 transition-all hover:scale-105 active:scale-95 flex items-center space-x-3">
                                <span className="uppercase tracking-widest">Signup</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        {/* Mobile Menu Placeholder */}
                        <div className="lg:hidden flex items-center space-x-3">
                            <Link to="/login" className="bg-slate-200/50 dark:bg-white/5 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-full border border-slate-900/10 dark:border-white/10">
                                Login
                            </Link>
                            <Link to="/signup" className="bg-primary-500 p-3 rounded-full shadow-lg shadow-primary-500/30">
                                <ArrowRight className="w-5 h-5 text-white" />
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="relative min-h-screen flex items-center justify-center pt-24">
                    <div className="max-w-[1200px] mx-auto px-6 w-full text-center flex flex-col items-center">

                        <div className="max-w-5xl mx-auto">
                            <h1 className="text-4xl md:text-6xl lg:text-8xl font-serif mb-8 leading-[0.95] tracking-tight text-slate-900 dark:text-white drop-shadow-2xl">
                                Data Driven. <br /> <span className="gradient-text italic">Profit Focused.</span>
                            </h1>
                        </div>

                        <div className="flex flex-wrap justify-center gap-6 md:gap-12 py-8 border-y border-slate-400/20 backdrop-blur-sm bg-white/5 rounded-3xl lg:rounded-full px-6 md:px-12 w-full max-w-4xl mx-auto shadow-[0_0_40px_rgba(0,0,0,0.05)]">
                            {[
                                ["500+", "Local Stores"],
                                ["₹10Cr+", "Sales Analyzed"],
                                ["99.9%", "Accuracy"],
                                ["24/7", "AI Support"]
                            ].map(([stat, label], i) => (
                                <div key={i} className="text-center group cursor-default">
                                    <div className="text-2xl md:text-4xl font-serif text-slate-900 dark:text-white mb-1 group-hover:text-primary-500 transition-colors uppercase tracking-tighter">{stat}</div>
                                    <div className="text-[8px] md:text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] font-bold">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 relative overflow-hidden">
                    <div className="max-w-[1200px] mx-auto px-6 text-center">
                        <div className="bg-white/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-sm rounded-[3rem] md:rounded-[4rem] overflow-hidden relative group p-10 md:p-20 w-full">
                            <div className="max-w-4xl mx-auto flex flex-col items-center">
                                <h2 className="text-4xl md:text-7xl font-serif text-slate-900 dark:text-white mb-10 leading-[0.9] tracking-tighter">
                                    Start analyzing your <br /> <span className="text-primary-600 dark:text-primary-400 italic">business today.</span>
                                </h2>
                                <p className="text-slate-400 text-lg md:text-xl mb-14 max-w-xl mx-auto font-medium leading-relaxed">
                                    Transform your store's output into clear, actionable data. The BulkBins advantage is just a signup away.
                                </p>
                                <div className="relative w-full h-[300px] md:h-[500px] rounded-3xl md:rounded-[3rem] overflow-hidden mb-12 shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10"></div>
                                    <img
                                        src={StoreImage}
                                        alt="Modern Retail Store"
                                        className="w-full h-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-[3s]"
                                    />
                                </div>
                                <Link to="/signup" className="bg-white text-slate-950 px-8 py-5 md:px-12 md:py-6 rounded-full text-lg md:text-xl font-black hover:bg-primary-5 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/5 flex items-center justify-center space-x-3 mx-auto">
                                    <span>Get Started Now</span>
                                    <ArrowRight className="w-6 h-6" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Dashboard Preview Section */}
                <section className="py-24 relative" id="preview">
                    <div className="max-w-[1200px] mx-auto px-6 text-center">
                        <div className="relative dark text-left">
                            <div className="absolute -inset-10 bg-primary-500/20 blur-[100px] opacity-20 rounded-full mx-auto"></div>
                            <DashboardPreview />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-28 bg-transparent relative overflow-hidden">
                    <div className="max-w-[1200px] mx-auto px-6 text-center">
                        <div className="max-w-3xl mb-16 mx-auto relative group">
                            <h2 className="text-4xl md:text-6xl font-serif mb-8 tracking-tighter text-slate-900 dark:text-white">Engineered for <br /> Scale & Growth.</h2>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-6xl mx-auto">
                            {[
                                { icon: BarChart3, title: "Sales Analytics", desc: "Real-time tracking of every transaction with detailed category breakdown and revenue maps." },
                                { icon: Box, title: "Inventory Tracking", desc: "Monitor stock levels, set reorder points, and reduce wastage with automated inventory alerts." },
                                { icon: LineChart, title: "Profit Forecasting", desc: "Analyze historical data to project future profits and identify growth opportunities." },
                                { icon: Cpu, title: "AI Insights", desc: "Custom intelligence that spots trends and provides business optimization tips automatically." }
                            ].map((feature, i) => (
                                <div key={i} className="bg-white/65 dark:bg-white/65 border border-white/20 backdrop-blur-md p-8 md:p-10 rounded-3xl md:rounded-[3rem] shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group w-full sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] min-w-[260px]">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-100 dark:bg-primary-500/20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 mx-auto group-hover:scale-110 group-hover:bg-primary-500/30 transition-all text-primary-600 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]">
                                        <feature.icon className="w-8 h-8 md:w-10 md:h-10" />
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-serif mb-2 tracking-tight text-[#0f172a]">{feature.title}</h3>
                                    <p className="text-slate-700 leading-relaxed font-semibold text-xs md:text-sm">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Security Section */}
                <section id="security" className="py-28">
                    <div className="max-w-[1200px] mx-auto px-6 text-center">
                        <div className="glass p-10 md:p-20 rounded-[3rem] md:rounded-[4rem] border-slate-300/30 dark:border-white/10 relative overflow-hidden w-full">
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 blur-[150px] -mr-64 -mt-64"></div>
                            <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto">
                                <div className="inline-block bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-full px-6 py-2.5 mb-10 shadow-[0_0_20px_rgba(249,115,22,0.1)] animate-shimmer">
                                    <span className="text-orange-600 dark:text-orange-400 text-[10px] md:text-sm font-black uppercase tracking-[0.3em]">Privacy First</span>
                                </div>
                                <h2 className="text-4xl md:text-7xl font-serif mb-12 leading-[1.1] tracking-tighter text-slate-900 dark:text-white">Your trust is our <br /> core foundation.</h2>

                                <div className="flex flex-wrap justify-center gap-4 md:gap-8 w-full mb-10 max-w-3xl mx-auto">
                                    {/* Security Pills */}
                                    {[
                                        "AES-256 Encryption",
                                        "TLS 1.3 Pipelines",
                                        "Advanced Auth",
                                        "Daily Data Backups"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-center space-x-4 bg-white/10 dark:bg-white/15 p-3 md:p-4 rounded-2xl md:rounded-[2rem] border border-white/20 group hover:bg-white/20 hover:scale-[1.03] hover:border-primary-500/50 hover:shadow-[0_0_30px_rgba(74,222,128,0.15)] transition-all cursor-pointer flex-grow min-w-[200px] backdrop-blur-sm">
                                            <CheckCircle2 className="text-primary-400 w-5 h-5 md:w-7 md:h-7 animate-soft-bounce" />
                                            <span className="text-white font-bold uppercase tracking-wide text-[10px] md:text-xs">{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="relative group mx-auto">
                                    <div className="absolute -inset-10 bg-gradient-to-tr from-primary-500/40 to-accent-500/40 blur-3xl opacity-30 group-hover:opacity-60 transition-opacity"></div>
                                    <div className="relative glass p-10 md:p-12 rounded-3xl md:rounded-[4rem] border-white/20 shadow-2xl transform hover:rotate-2 transition-transform duration-500 max-w-xs mx-auto">
                                        <ShieldCheck className="w-24 h-24 md:w-32 md:h-32 text-primary-400 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(74,222,128,0.4)]" />
                                        <div className="text-2xl md:text-3xl font-serif mb-2 tracking-tight">Verified Secure</div>
                                        <p className="text-slate-500 font-bold tracking-widest uppercase text-[8px] md:text-[10px]">Compliance Standard 2026</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="py-16 border-t border-white/5 bg-transparent backdrop-blur-none">
                    <div className="max-w-[1240px] mx-auto px-6 text-center flex flex-col items-center">
                        <div className="flex items-center justify-center space-x-4">
                            <img src={Logo} alt="Logo" className="w-12 h-12 object-contain rounded-md drop-shadow-[0_10px_30px_rgba(74,222,128,0.2)] animate-float" />
                            <span className="text-3xl md:text-4xl font-serif tracking-tighter text-white">BulkBins</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Landing;
