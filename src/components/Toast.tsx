/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextValue {
    show: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-indigo-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-orange-400" />,
};

const BORDERS: Record<ToastType, string> = {
    success: 'border-green-500/20',
    error: 'border-red-500/20',
    info: 'border-indigo-500/20',
    warning: 'border-orange-500/20',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const show = useCallback((type: ToastType, message: string) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, type, message }]);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => setToasts(prev => prev.slice(1)), 5000);
        return () => clearTimeout(timer);
    }, [toasts]);

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 p-4 bg-gray-900/95 backdrop-blur-xl border ${BORDERS[toast.type]} rounded-2xl shadow-2xl shadow-black/50 animate-in slide-in-from-right-4 duration-300`}
                    >
                        {ICONS[toast.type]}
                        <p className="flex-1 text-sm text-gray-300 font-medium">{toast.message}</p>
                        <button onClick={() => dismiss(toast.id)} className="text-gray-600 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
