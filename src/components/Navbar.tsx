import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';

/**
 * Shared top navigation bar used across all public-facing pages
 * (Landing, Features, HowItWorks, Desktop, Privacy, Terms, Product, Company).
 * NOT used on Dashboard or Login pages.
 */
export function Navbar() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return (
        <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 group cursor-pointer">
                    <img
                        src="/logo.png"
                        alt="DriveOS Logo"
                        className="w-16 h-16 group-hover:scale-110 transition-transform duration-300"
                    />
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                    <Link to="/features" className="hover:text-white transition-colors">Features</Link>
                    <Link to="/how-it-works" className="hover:text-white transition-colors">How it Works</Link>
                    <Link to="/desktop" className="hover:text-white transition-colors">Desktop</Link>
                </div>

                {/* CTA Buttons */}
                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <Button asChild variant="default" className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700">
                            <Link to="/dashboard">Go to Dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                Sign In
                            </Link>
                            <Button asChild className="rounded-full px-6 bg-white text-black hover:bg-gray-200 transition-all border-none font-semibold">
                                <Link to="/signup">Get Started</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
