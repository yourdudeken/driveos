import { Footer } from '@/components/Footer';
import { Server, Key, FolderOpen, ArrowDown } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function HowItWorks() {
    return (
        <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-indigo-500/30 text-center">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            {/* Navbar */}
            <Navbar />

            <main className="flex-1 relative z-10 max-w-5xl mx-auto px-6 py-24">
                <div className="mb-24">
                    <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter">Ownership by<br />Design.</h1>
                    <p className="text-xl text-gray-400 leading-relaxed font-medium max-w-2xl mx-auto">
                        Traditional apps store your data on their servers. We store yours where it belongs: in your own Google Drive.
                    </p>
                </div>

                <div className="space-y-32">
                    {/* Step 1 */}
                    <div className="flex flex-col items-center gap-12">
                        <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-black text-2xl">
                            01
                        </div>
                        <div className="max-w-xl">
                            <h2 className="text-3xl font-bold mb-6">Open Source Client</h2>
                            <p className="text-gray-400 leading-relaxed text-lg italic">
                                "The app is just an interface. You are the host."
                            </p>
                            <div className="mt-8 p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-left font-mono text-sm text-gray-500">
                                <p className="mb-2">// Local State</p>
                                <p>const [tasks, setTasks] = useState([]);</p>
                                <p className="mt-4 text-indigo-400">// No database connection here.</p>
                                <p className="text-indigo-400">// Just API calls to YOUR Drive.</p>
                            </div>
                        </div>
                        <ArrowDown className="w-8 h-8 text-gray-800 animate-bounce" />
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center gap-12">
                        <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 font-black text-2xl">
                            02
                        </div>
                        <div className="max-w-xl">
                            <h2 className="text-3xl font-bold mb-6">OAuth 2.0 Security</h2>
                            <p className="text-gray-400 leading-relaxed text-lg">
                                When you sign in, Google provides a secure token that allows our app to communicate
                                only with the specific folders it creates. We never see your password.
                            </p>
                            <div className="mt-8 flex justify-center gap-8">
                                <div className="p-4 rounded-2xl bg-white/5 flex flex-col items-center gap-3">
                                    <Key className="w-6 h-6 text-indigo-400" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Secure Token</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 flex flex-col items-center gap-3">
                                    <Server className="w-6 h-6 text-indigo-400" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Google Auth</span>
                                </div>
                            </div>
                        </div>
                        <ArrowDown className="w-8 h-8 text-gray-800 animate-bounce" />
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center gap-12">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-400 font-black text-2xl">
                            03
                        </div>
                        <div className="max-w-xl">
                            <h2 className="text-3xl font-bold mb-6">Infinite Storage</h2>
                            <p className="text-gray-400 leading-relaxed text-lg">
                                Tasks are stored as lightweight <code className="text-white">.json</code> files.
                                Pictures and documents are stored in subfolders. It's your personal
                                productivity database, visible and accessible directly via drive.google.com.
                            </p>
                            <div className="mt-8 p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-left">
                                <div className="flex items-center gap-3 mb-4">
                                    <FolderOpen className="w-5 h-5 text-yellow-500" />
                                    <span className="font-bold">DRIVEOS /</span>
                                </div>
                                <div className="pl-8 space-y-2 text-sm text-gray-500 font-mono">
                                    <p>|_ tasks/</p>
                                    <p className="pl-4">|_ task_2026_02_25.json</p>
                                    <p>|_ attachments/</p>
                                    <p className="pl-4 text-indigo-400">|_ logo_concept.png</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
