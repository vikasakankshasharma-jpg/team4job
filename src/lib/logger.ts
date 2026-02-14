import * as Sentry from "@sentry/nextjs";

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
    [key: string]: any;
}

const isProduction = process.env.NODE_ENV === 'production';

class Logger {
    private log(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...context,
            environment: process.env.NODE_ENV,
        };

        if (isProduction) {
            // In production, emit JSON for structured logging (e.g. Google Cloud Logging)
            console.log(JSON.stringify(logEntry));
        } else {
            // In development, pretty print
            const color = this.getColor(level);
            console.log(`${color}[${level.toUpperCase()}] \x1b[0m${message}`, context || '');
        }

        // Integrate with Sentry for errors and warnings
        if (level === 'error') {
            Sentry.captureException(new Error(message), { extra: context });
        } else if (level === 'warn') {
            Sentry.captureMessage(message, { level: 'warning', extra: context });
        }
    }

    private getColor(level: LogLevel): string {
        switch (level) {
            case 'info': return '\x1b[36m'; // Cyan
            case 'warn': return '\x1b[33m'; // Yellow
            case 'error': return '\x1b[31m'; // Red
            case 'debug': return '\x1b[90m'; // Gray
            default: return '\x1b[37m'; // White
        }
    }

    info(message: string, context?: LogContext) {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log('warn', message, context);
    }

    error(message: string, error?: any, context?: LogContext) {
        const errorContext = {
            ...context,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        };
        this.log('error', message, errorContext);
    }

    debug(message: string, context?: LogContext) {
        if (!isProduction) {
            this.log('debug', message, context);
        }
    }
}

export const logger = new Logger();
