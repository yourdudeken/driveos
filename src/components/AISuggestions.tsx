import { Sparkles } from 'lucide-react';

interface AISuggestionsProps {
    suggestions: string[];
    isLoading: boolean;
    showSuggestions: boolean;
    onSelect: (suggestion: string) => void;
    onDismiss: () => void;
}

export function AISuggestions({ suggestions, isLoading, showSuggestions, onSelect, onDismiss }: AISuggestionsProps) {
    if (!showSuggestions && !isLoading) return null;

    return (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl">
            {isLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    Generating suggestions...
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-indigo-400 border-b border-white/5">
                        <Sparkles className="w-3 h-3" />
                        AI Suggestions
                    </div>
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => { onSelect(s); onDismiss(); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
