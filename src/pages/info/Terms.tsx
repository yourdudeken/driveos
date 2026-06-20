import { Footer } from '@/components/Footer';
import { FileText, Scale, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function Terms() {
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
                    <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">Terms of Service</h1>
                    <p className="text-xl text-gray-400 leading-relaxed font-medium">
                        The agreement between you and transparency.
                    </p>
                </div>

                <div className="space-y-16">
                    <section>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <FileText className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold">1. Agreement to Terms</h2>
                        </div>
                        <div className="text-gray-400 space-y-4 leading-relaxed">
                            <p>
                                By accessing DriveOS, you agree to be bound by these Terms of Service.
                                DriveOS is an open-source productivity interface that works on top of
                                your Google Drive storage.
                            </p>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                <Scale className="w-6 h-6 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold">2. Use of License</h2>
                        </div>
                        <div className="text-gray-400 space-y-4 leading-relaxed">
                            <p>
                                DriveOS is open-source software. You are granted the right to use the web application
                                for personal or commercial use. You are responsible for maintaining the
                                confidentiality of your Google account and for all activities under your account.
                            </p>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold">3. Disclaimer</h2>
                        </div>
                        <div className="text-gray-400 space-y-4 leading-relaxed">
                            <p>
                                DriveOS is provided "as is". We make no warranties, expressed or implied,
                                regarding the service. Since we do not store your data, we cannot recover
                                deleted tasks or folders from your Google Drive if you accidentally remove them.
                            </p>
                        </div>
                    </section>

                    <section className="p-8 rounded-[2rem] bg-indigo-600/10 border border-indigo-500/20">
                        <div className="flex items-center gap-4 mb-6">
                            <ShieldCheck className="w-6 h-6 text-indigo-400" />
                            <h2 className="text-2xl font-bold">4. Limitation of Liability</h2>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                            In no event shall DriveOS or its developers be liable for any damages
                            (including, without limitation, damages for loss of data or profit)
                            arising out of the use or inability to use the application.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
