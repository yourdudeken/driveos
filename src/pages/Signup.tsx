import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAuthStore } from '@/store/authStore';
import { Navigate, Link } from 'react-router-dom';
import { Loader2, Shield, Zap, Cloud } from 'lucide-react';

export default function Signup() {
    const { login, isLoading } = useGoogleAuth();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div className="min-h-screen w-full flex flex-col bg-black overflow-x-hidden relative font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
                <div className="absolute top-[30%] left-[20%] w-[30%] h-[30%] bg-pink-600/10 rounded-full mix-blend-screen filter blur-[100px] animate-pulse delay-1000"></div>
            </div>

            <div className="flex-1 flex items-center justify-center py-16 relative z-10">
                <div className="w-full max-w-md px-6">
                    {/* Logo */}
                    <Link to="/" className="flex items-center justify-center mb-10 group">
                        <img
                            src="/logo.png"
                            alt="DriveOS Logo"
                            className="w-20 h-20 group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl"
                        />
                    </Link>

                    {/* Auth Card */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                        {/* Top accent line - purple for signup */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60"></div>

                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold text-white mb-3">Create your account</h1>
                            <p className="text-gray-400">Join thousands of users who own their data.</p>
                        </div>

                        {/* Value props before signup CTA */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[
                                { icon: <Shield className="w-5 h-5 text-indigo-400" />, label: 'Zero-Knowledge' },
                                { icon: <Cloud className="w-5 h-5 text-purple-400" />, label: 'Drive Sync' },
                                { icon: <Zap className="w-5 h-5 text-pink-400" />, label: 'Instant Setup' },
                            ].map((item) => (
                                <div key={item.label} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                    {item.icon}
                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold text-center">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Google Sign Up */}
                        <button
                            onClick={login}
                            disabled={isLoading}
                            className="w-full group relative flex items-center justify-center gap-3 py-4 px-6 bg-white text-black rounded-2xl font-bold text-lg hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                            ) : (
                                <>
                                    <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    Sign up with Google
                                </>
                            )}
                        </button>

                        {/* Switch to login */}
                        <div className="mt-8 text-center">
                            <p className="text-sm text-gray-500">
                                Already have an account?{' '}
                                <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-gray-600 px-8 leading-relaxed">
                        By signing up, you agree to our{' '}
                        <Link to="/terms" className="text-gray-500 hover:text-white transition-colors">Terms</Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy Policy</Link>.
                        Your tasks are stored exclusively in a folder named{' '}
                        <span className="text-gray-400 font-mono">DRIVEOS</span> in your Google Drive.
                    </p>
                </div>
            </div>
        </div>
    );
}
