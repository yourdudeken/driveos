import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Shield, Cloud, Zap, ArrowRight, CheckCircle2, Github } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';

export default function Landing() {
    useEffect(() => {
        document.title = "DriveOS | Privacy-First Todo App";
        const meta = document.querySelector('meta[name="description"]');
        if (meta) {
            meta.setAttribute("content", "Stunningly simple, completely private. DriveOS stores your tasks directly in your Google Drive. No external servers, no tracking.");
        }
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-black text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[100px] animate-pulse delay-1000"></div>
            </div>

            {/* Navbar */}
            <Navbar />

            <main className="flex-1 relative z-10">
                {/* Hero Section */}
                <section className="pt-20 pb-32 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-sm font-medium mb-8 animate-fade-in">
                            <Zap className="w-4 h-4" />
                            <span>Now with Google Drive Sync 2.0</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent leading-[1.1]">
                            Your tasks, your drive,<br />
                            <span className="text-indigo-500">completely yours.</span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-xl text-gray-400 mb-12 leading-relaxed">
                            The world's first privacy-focused todo app that stores 100% of your data
                            directly in your personal Google Drive. No external databases. No tracking. No limits.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button asChild size="lg" className="rounded-full px-8 py-7 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 group">
                                <Link to="/signup" className="flex items-center gap-2">
                                    Start Building for Free
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-7 text-lg border-white/10 hover:bg-white/5 bg-transparent text-white">
                                <a href="https://github.com/yourdudeken/driveos" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                                    <Github className="w-5 h-5" />
                                    View Source
                                </a>
                            </Button>
                        </div>

                        {/* Dashboard Preview Mockup */}
                        <div className="mt-24 relative max-w-5xl mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-20"></div>
                            <div className="p-1 rounded-[2.5rem] bg-gradient-to-b from-white/20 to-transparent shadow-2xl">
                                <div className="rounded-[2.4rem] overflow-hidden bg-gray-900 border border-white/10 shadow-2xl aspect-[16/10] flex items-center justify-center">
                                    {/* This would ideally be a real screenshot or complex CSS mockup */}
                                    <div className="text-center p-8">
                                        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                            <Shield className="w-10 h-10 text-indigo-400" />
                                        </div>
                                        <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">Encrypted. Private. Local.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="py-32 border-t border-white/5 bg-white/[0.02]">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">Built for ultimate privacy</h2>
                            <p className="text-gray-400 text-lg">Every feature is designed with one goal: giving you control of your data.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: <Shield className="w-8 h-8 text-indigo-400" />,
                                    title: "100% User-Owned",
                                    description: "All tasks and attachments live in your Google Drive. We never see, touch, or store your data."
                                },
                                {
                                    icon: <Cloud className="w-8 h-8 text-purple-400" />,
                                    title: "Google Drive Sync",
                                    description: "Automatic synchronization across all your devices using your existing Google infrastructure."
                                },
                                {
                                    icon: <Zap className="w-8 h-8 text-pink-400" />,
                                    title: "Zero Latency",
                                    description: "Optimized for speed. Tasks are cached locally and synced in the background for a seamless experience."
                                }
                            ].map((feature, i) => (
                                <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all hover:-translate-y-2 group">
                                    <div className="mb-6 p-4 w-fit rounded-2xl bg-white/5 group-hover:bg-indigo-500/10 transition-colors">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                    <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Security Section */}
                <section id="security" className="py-32 border-t border-white/5 bg-black">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row items-center gap-16">
                            <div className="flex-1 order-2 md:order-1">
                                <div className="relative">
                                    <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full"></div>
                                    <div className="relative p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 overflow-hidden">
                                        <pre className="text-xs md:text-sm font-mono text-indigo-300 leading-relaxed">
                                            <code>{`
// DriveOS Security Protocol
{
  "auth": "OAuth 2.0",
  "data_storage": "Client-Side Only",
  "encryption": "Google Drive Native",
  "privacy": "Zero-Knowledge",
  "third_party_sync": false,
  "developer_access": false
}
                                            `}</code>
                                        </pre>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 order-1 md:order-2">
                                <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">Enterprise-grade security, <br /><span className="text-indigo-500">for everyone.</span></h2>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                    DriveOS leverages Google’s multi-billion dollar security infrastructure.
                                    We don't store your tasks on our servers because we don't have servers for your tasks.
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "No central database means no central point of failure.",
                                        "Your data never leaves Google's encrypted environment.",
                                        "Revoke access at any time from your Google Dashboard."
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-gray-300">
                                            <Shield className="w-5 h-5 text-indigo-500" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="how-it-works" className="py-32 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row gap-16 items-center">
                            <div className="flex-1">
                                <h2 className="text-4xl font-bold mb-8">As simple as 1, 2, Sync.</h2>
                                <div className="space-y-8">
                                    {[
                                        { step: "01", title: "Authenticate with Google", desc: "Securely link your account using industry-standard OAuth 2.0." },
                                        { step: "02", title: "Create Your Space", desc: "DriveOS automatically creates an organized folder structure in your Drive." },
                                        { step: "03", title: "Start Organizing", desc: "Add tasks, upload attachments, and enjoy full control of your digital life." }
                                    ].map((s, i) => (
                                        <div key={i} className="flex gap-6 group">
                                            <span className="text-4xl font-black text-white/10 group-hover:text-indigo-500/40 transition-colors">{s.step}</span>
                                            <div>
                                                <h4 className="text-xl font-bold mb-2">{s.title}</h4>
                                                <p className="text-gray-400">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 w-full p-8 rounded-3xl bg-indigo-600/10 border border-indigo-500/20">
                                <div className="font-mono text-sm text-indigo-300">
                                    <p className="mb-2">// Data Flow Schema</p>
                                    <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <span>POST /drive/v3/files (task-123.json)</span>
                                        </div>
                                        <div className="flex items-center gap-2 pl-6 border-l border-white/10 ml-2">
                                            <span className="text-gray-500">→ Storing in DRIVEOS/ root</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            <span>MULTIPART /upload/drive/v3 (attachment.png)</span>
                                        </div>
                                        <div className="flex items-center gap-2 pl-6 border-l border-white/10 ml-2">
                                            <span className="text-gray-500">→ Storing in DRIVEOS/PICTURES</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
