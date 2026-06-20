import { Github, Twitter, Mail, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="relative z-10 py-12 md:py-20 border-t border-white/5 bg-black">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-6 group w-fit">
                            <img src="/logo.png" alt="DriveOS Logo" className="w-14 h-14 group-hover:scale-110 transition-transform duration-300" />
                            <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent uppercase">

                            </span>
                        </Link>
                        <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-8">
                            A privacy-first task management system that puts you in control.
                            Your data, your drive, your rules. Built for the privacy-conscious
                            professional.
                        </p>
                        <div className="flex items-center gap-5">
                            <a href="https://x.com/driveos" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="https://github.com/yourdudeken/driveos" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-400 transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="mailto:hello@driveos.com" className="text-gray-400 hover:text-indigo-400 transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-6 uppercase tracking-[0.2em] text-[10px]">
                            <Link to="/product" className="text-white font-bold hover:text-indigo-400 transition-colors">Product</Link>
                        </h4>
                        <ul className="space-y-4 text-sm text-gray-500 font-medium">
                            <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link to="/how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
                            <li><Link to="/desktop" className="hover:text-white transition-colors">Desktop App</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-6 uppercase tracking-[0.2em] text-[10px]">
                            <Link to="/company" className="text-white font-bold hover:text-indigo-400 transition-colors">Company</Link>
                        </h4>
                        <ul className="space-y-4 text-sm text-gray-500 font-medium">
                            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                            <li><a href="https://github.com/yourdudeken/driveos" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                                Open Source <ExternalLink className="w-3 h-3" />
                            </a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
                    <p>© 2026 DRIVEOS. ALL RIGHTS RESERVED.</p>
                    <div className="flex items-center gap-8">
                        <span>Built by human for humans</span>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span>Systems Operational</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
