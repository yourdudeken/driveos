import { Footer } from '@/components/Footer';
import { Heart, Github, Coffee, Mail, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function Company() {
    return (
        <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            {/* Navbar */}
            <Navbar />

            <main className="flex-1 relative z-10 max-w-7xl mx-auto px-6 py-24">
                <div className="text-center mb-24">
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter">The Company.</h1>
                    <p className="text-xl text-gray-400 leading-relaxed font-medium max-w-2xl mx-auto">
                        We aren't a typical tech company. We're a collective of developers who believe data privacy should be the default, not an option.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
                    <div className="p-12 rounded-[3rem] bg-white/[0.02] border border-white/5">
                        <Heart className="w-10 h-10 text-red-500 mb-8" />
                        <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                        <p className="text-gray-400 leading-relaxed">
                            To build tools that respect user autonomy. In an era of data harvesting, DriveOS
                            stands as a proof of concept that premium productivity tools can exist without
                            centralized data storage.
                        </p>
                    </div>

                    <div className="p-12 rounded-[3rem] bg-indigo-600/5 border border-indigo-500/10">
                        <Github className="w-10 h-10 text-indigo-400 mb-8" />
                        <h2 className="text-3xl font-bold mb-4">Open Source</h2>
                        <p className="text-gray-400 leading-relaxed">
                            Transparency is our core value. The entire DriveOS stack is open-source.
                            Anyone can audit our code, contribute features, or host their own instance.
                        </p>
                        <a href="https://github.com/yourdudeken/driveos" className="inline-flex items-center gap-2 mt-8 text-indigo-400 font-bold hover:gap-3 transition-all">
                            Explore on GitHub <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto text-center border-t border-white/5 pt-24">
                    <h2 className="text-4xl font-bold mb-8 tracking-tight">Stay in touch</h2>
                    <div className="flex flex-wrap justify-center gap-12">
                        <div className="flex flex-col items-center gap-4 group cursor-pointer">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                                <Mail className="w-6 h-6 text-indigo-400" />
                            </div>
                            <span className="text-sm font-bold text-gray-500">Email</span>
                        </div>
                        <div className="flex flex-col items-center gap-4 group cursor-pointer">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                                <Coffee className="w-6 h-6 text-indigo-400" />
                            </div>
                            <span className="text-sm font-bold text-gray-500">Sponsor</span>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
