import { useState, useEffect, useRef } from 'react';
import { getSuggestions } from '@/lib/openai';

export function useAISuggestions(field: string, value: string) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!value.trim() || value.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        timerRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const result = await getSuggestions(field, value);
                setSuggestions(result);
                setShowSuggestions(result.length > 0);
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [field, value]);

    const dismiss = () => setShowSuggestions(false);

    return { suggestions, isLoading, showSuggestions, dismiss };
}
