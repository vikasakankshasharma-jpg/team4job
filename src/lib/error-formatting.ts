/**
 * Formats technical errors into user-friendly messages.
 * Maps common error codes and patterns to actionable advice.
 */
export function formatFriendlyError(error: any): string {
    if (!error) return 'active'; // Default key if needed, or 'serverError'

    const message = error.message || error.toString();
    const code = error.code || error.status;

    // Network / Connectivity
    if (
        message.includes('fetch failed') ||
        message.includes('network') ||
        message.includes('ENOTFOUND') ||
        message.includes('ECONNREFUSED')
    ) {
        return "networkError";
    }

    // AI Service Overload / 503
    if (
        code === 503 ||
        code === 429 ||
        message.includes('overloaded') ||
        message.includes('capacity') ||
        message.includes('Too Many Requests')
    ) {
        return "aiOverload";
    }

    // AI Generation Failed / Null Response
    if (message.includes('Failed to generate') || message.includes('returned null')) {
        return "aiGenerationFailed";
    }

    // Content Policy / Safety
    if (message.includes('safety') || message.includes('content policy') || message.includes('harmful')) {
        return "contentSafety";
    }

    // Default Fallback
    // Return original message if it's short and readable
    if (message.length < 100 && !message.includes('{')) {
        return message;
    }

    return "serverError";
}
