import { validateMessageContent, cn } from '@/lib/utils';

describe('utils', () => {
    describe('validateMessageContent', () => {
        it('should return valid for normal message', () => {
            const result = validateMessageContent('Hello, can you help with installation?');
            expect(result.isValid).toBe(true);
        });

        it('should detect phone numbers', () => {
            const result = validateMessageContent('Call me at 9876543210');
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('phone numbers');
        });

        it('should detect email addresses', () => {
            const result = validateMessageContent('Email me at test@example.com');
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('email addresses');
        });

        it('should detect off-platform keywords', () => {
            const result = validateMessageContent('Let us deal outside');
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('off-platform communication');
        });
    });

    describe('cn', () => {
        it('should merge classes correctly', () => {
            expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
        });

        it('should handle conditional classes', () => {
            expect(cn('bg-red-500', false && 'text-white', 'p-4')).toBe('bg-red-500 p-4');
        });

        it('should resolve tailwind conflicts', () => {
            // twMerge should ensure the last one wins
            expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
        });
    });
});
