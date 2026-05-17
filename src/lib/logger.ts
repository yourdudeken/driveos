type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    sessionId: string;
    context?: Record<string, unknown>;
    error?: { name: string; message: string };
}

const SESSION_ID = crypto.randomUUID();
const LEVELS: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL: LogLevel =
    (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
    (import.meta.env.PROD ? 'INFO' : 'DEBUG');

function shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[CURRENT_LEVEL];
}

function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        sessionId: SESSION_ID,
        context,
        error: error instanceof Error ? { name: error.name, message: error.message } : undefined,
    };
}

function write(entry: LogEntry): void {
    if (!shouldLog(entry.level)) return;

    const fn = entry.level === 'ERROR' ? console.error
        : entry.level === 'WARN' ? console.warn
            : console.log;

    const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.sessionId.slice(0, 8)}]`;
    fn(`${prefix} ${entry.message}`, entry.context ?? '', entry.error ?? '');
}

export const logger = {
    debug: (message: string, context?: Record<string, unknown>) =>
        write(createEntry('DEBUG', message, context)),

    info: (message: string, context?: Record<string, unknown>) =>
        write(createEntry('INFO', message, context)),

    warn: (message: string, context?: Record<string, unknown>, error?: unknown) =>
        write(createEntry('WARN', message, context, error)),

    error: (message: string, context?: Record<string, unknown>, error?: unknown) =>
        write(createEntry('ERROR', message, context, error)),
};
