import { Footer } from '@/components/Footer';
import { Shield, Zap, Layout, Columns, Search, Tag, MousePointer2, Smartphone, Lock } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function Features() {
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
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter">Engineered for<br />productivity.</h1>
                    <p className="text-xl text-gray-400 leading-relaxed font-medium max-w-3xl mx-auto">
                        We've packed DriveOS with professional features while keeping the interface clean and the data entirely in your control.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        {
                            icon: <Columns className="w-8 h-8 text-indigo-400" />,
                            title: "Kanban Board",
                            desc: "Visualize your workflow with columns for To-Do, In Progress, and Completed."
                        },
                        {
                            icon: <Layout className="w-8 h-8 text-purple-400" />,
                            title: "Grid View",
                            desc: "A clean, card-based layout for quick scanning and organized task management."
                        },
                        {
                            icon: <Search className="w-8 h-8 text-green-400" />,
                            title: "In-Depth Search",
                            desc: "Instantly find any task by searching through titles, descriptions, and categories."
                        },
                        {
                            icon: <Tag className="w-8 h-8 text-pink-400" />,
                            title: "Smart Categorization",
                            desc: "Organize tasks with customizable category pills and quick-access filters."
                        },
                        {
                            icon: <MousePointer2 className="w-8 h-8 text-orange-400" />,
                            title: "Drag & Drop",
                            desc: "Intuitive task management—drag cards between columns and reorder with ease."
                        },
                        {
                            icon: <Shield className="w-8 h-8 text-blue-400" />,
                            title: "Private Storage",
                            desc: "Your tasks are stored as encrypted JSON files in your own private Google Drive."
                        },
                        {
                            icon: <Zap className="w-8 h-8 text-yellow-400" />,
                            title: "Live Syncing",
                            desc: "Background synchronization ensures your data is always up to date across all devices."
                        },
                        {
                            icon: <Smartphone className="w-8 h-8 text-cyan-400" />,
                            title: "Responsive Design",
                            desc: "A premium experience on desktop, tablet, and mobile with a tailored sidebar."
                        },
                        {
                            icon: <Lock className="w-8 h-8 text-red-400" />,
                            title: "Zero-Knowledge",
                            desc: "We don't have a database for your tasks. We couldn't read them even if we wanted to."
                        }
                    ].map((f, i) => (
                        <div key={i} className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all group">
                            <div className="mb-6 p-4 w-fit rounded-2xl bg-white/5 group-hover:bg-indigo-500/10 transition-colors">
                                {f.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
