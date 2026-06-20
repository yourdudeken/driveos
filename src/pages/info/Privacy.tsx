import { Footer } from '@/components/Footer';
import { Shield, Lock, Eye, Download } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function Privacy() {
    return (
        <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-indigo-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
            </div>

            {/* Navbar */}
            <Navbar />

            <main className="flex-1 relative z-10 max-w-4xl mx-auto px-6 py-24">
                <div className="mb-16">
                    <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">Privacy Policy</h1>
                    <p className="text-xl text-gray-400 leading-relaxed font-medium">
                        Your privacy is not a feature. It's our foundation.
                    </p>
                </div>

                <div className="space-y-16">
                    <section>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Shield className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold">Data Ownership</h2>
                        </div>
                        <div className="text-gray-400 space-y-4 leading-relaxed">
                            <p>
                                DriveOS is built on a "Bring Your Own Storage" model. When you use DriveOS,
                                your data is stored exclusively in your personal Google Drive account in a
                                folder named <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">DRIVEOS</span>.
                            </p>
                            <p>
                                We do not own any servers used to store your task data. This means your
                                information never passes through our infrastructure in any unencrypted or
                                readable form.
                            </p>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <Eye className="w-6 h-6 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold">What We Collect</h2>
                        </div>
                        <div className="text-gray-400 space-y-4 leading-relaxed">
                            <p>
                                We collect the absolute minimum required to provide the service:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Basic Google Profile info (Name, Email, Profile Picture) to identify you in the UI.</li>
                                <li>Anonymous usage statistics (e.g. "button clicked") to improve the product experience.</li>
                            </ul>
                            <p className="font-bold text-white">We NEVER collect:</p>
                            <ul className="list-disc pl-6 space-y-2 text-red-400/80">
                                <li>Your task titles or descriptions.</li>
                                <li>The contents of your attachments/files.</li>
                                <li>Your Google Account password.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                <Lock className="w-6 h-6 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold">Security</h2>
                        </div>
                        <div className="text-gray-400 space-y-4 leading-relaxed">
                            <p>
                                By leveraging Google Drive's infrastructure, you benefit from Google's world-class
                                security team. Authentication is handled entirely through Google OAuth 2.0,
                                and we never see your credentials.
                            </p>
                        </div>
                    </section>

                    <section className="p-8 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20">
                        <div className="flex items-center gap-4 mb-6">
                            <Download className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-bold">Your Rights</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            Since your data is in your Google Drive, you have the ultimate right: you can delete
                            the <span className="text-white font-mono">DRIVEOS</span> folder at any time
                            using the Google Drive web interface. You can also revoke our app's access
                            from your Google Account settings instantly.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
