import { logger } from './logger';

interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 10000, onRetry } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxAttempts) throw error;

            const isQuota = error && typeof error === 'object' && 'response' in error &&
                (error as { response?: { status?: number } }).response?.status === 429;

            const isServerError = error && typeof error === 'object' && 'response' in error &&
                (error as { response?: { status?: number } }).response?.status !== undefined &&
                (error as { response?: { status?: number } }).response!.status! >= 500;

            if (!isQuota && !isServerError) throw error;

            const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
            const jitter = delay * (0.5 + Math.random() * 0.5);

            logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${Math.round(jitter)}ms`, {
                attempt,
                maxAttempts,
                delay: Math.round(jitter),
            }, error);

            onRetry?.(attempt, error);

            await new Promise(resolve => setTimeout(resolve, jitter));
        }
    }

    throw new Error('Unreachable');
}
