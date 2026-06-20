import { Footer } from '@/components/Footer';
import { Monitor, Smartphone, Globe, ArrowRight, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';

export default function Desktop() {
    return (
        <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            {/* Navbar */}
            <Navbar />

            <main className="flex-1 relative z-10 max-w-6xl mx-auto px-6 py-24">
                <div className="text-center mb-24">
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter">Your space, <br />everywhere.</h1>
                    <p className="text-xl text-gray-400 leading-relaxed font-medium max-w-2xl mx-auto">
                        DriveOS is currently available as a progressive web app, with dedicated desktop and mobile apps coming soon.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                    {[
                        {
                            icon: <Monitor className="w-10 h-10 text-indigo-400" />,
                            title: "Desktop App",
                            status: "Coming Soon",
                            desc: "Native macOS, Windows, and Linux experiences with system tray integration."
                        },
                        {
                            icon: <Smartphone className="w-10 h-10 text-purple-400" />,
                            title: "Mobile App",
                            status: "In Development",
                            desc: "iOS and Android apps with widgets and rich notifications."
                        },
                        {
                            icon: <Globe className="w-10 h-10 text-green-400" />,
                            title: "Web App",
                            status: "Available Now",
                            desc: "The full premium experience accessible from any browser in the world."
                        }
                    ].map((app, i) => (
                        <div key={i} className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex flex-col items-center text-center group">
                            <div className="mb-8 p-6 rounded-3xl bg-white/5 group-hover:bg-indigo-500/10 transition-colors">
                                {app.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-2">{app.title}</h3>
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 px-3 py-1 rounded-full ${app.status === 'Available Now' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                                {app.status}
                            </span>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8">{app.desc}</p>
                            {app.status === 'Available Now' ? (
                                <Link to="/login" className="flex items-center gap-2 text-indigo-400 font-bold hover:gap-3 transition-all">
                                    Launch Web <ArrowRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <button disabled className="text-gray-700 font-bold cursor-not-allowed">
                                    Coming Soon
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-12 rounded-[3rem] bg-indigo-600/10 border border-indigo-500/20 text-center">
                    <h2 className="text-3xl font-bold mb-6">Want to contribute?</h2>
                    <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                        DriveOS is open-source. Help us build the native desktop clients or mobile experiences
                        on GitHub.
                    </p>
                    <a href="https://github.com/yourdudeken/driveos" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-bold hover:bg-gray-200 transition-all">
                        <Github className="w-5 h-5" />
                        Explore the Repository
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
}
