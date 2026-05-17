import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '@/lib/retry';

describe('withRetry', () => {
    it('returns result on success', async () => {
        const fn = vi.fn().mockResolvedValue('ok');
        await expect(withRetry(fn)).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 then succeeds', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce({ response: { status: 429 } })
            .mockResolvedValueOnce('ok');

        await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 5xx then succeeds', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce({ response: { status: 500 } })
            .mockResolvedValueOnce('ok');

        await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('fails fast on 4xx non-retryable', async () => {
        const fn = vi.fn().mockRejectedValue({ response: { status: 404 } });
        await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toBeDefined();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('throws after exhausting retries', async () => {
        const error = { response: { status: 500 } };
        const fn = vi.fn().mockRejectedValue(error);

        await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toBe(error);
        expect(fn).toHaveBeenCalledTimes(2);
    });
});
