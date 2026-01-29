// infrastructure/logger/index.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
    userId?: string;
    action?: string;
    resource?: string;
    metadata?: Record<string, any>;
    [key: string]: any; // Allow any additional properties for flexibility
}

/**
 * Centralized logger for the application
 * Replaces scattered console.log/warn/error calls
 */
class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? JSON.stringify(context) : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message} ${contextStr}`;
    }

    info(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            console.log(this.formatMessage('info', message, context));
        }
    }

    warn(message: string, context?: LogContext) {
        console.warn(this.formatMessage('warn', message, context));
    }

    error(message: string, error?: Error | any, context?: LogContext) {
        const errorContext = {
            ...context,
            error: error?.message || String(error),
            stack: error?.stack,
        };
        console.error(this.formatMessage('error', message, errorContext));
    }

    debug(message: string, context?: LogContext) {
        if (this.isDevelopment) {
            console.debug(this.formatMessage('debug', message, context));
        }
    }

    /**
     * Log admin actions for audit trail
     */
    adminAction(adminId: string, action: string, resource: string, metadata?: Record<string, any>) {
        this.info('Admin action', {
            userId: adminId,
            action,
            resource,
            metadata,
        });
    }

    /**
     * Log user activity
     */
    userActivity(userId: string, action: string, metadata?: Record<string, any>) {
        this.info('User activity', {
            userId,
            action,
            metadata,
        });
    }
}

export const logger = new Logger();
