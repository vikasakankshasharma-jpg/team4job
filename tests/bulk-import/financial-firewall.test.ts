import { validateUntrustedRow } from '@/domains/bulk-import/bulk-import.schema';

describe('Bulk Import - Phase 8C Schema Allowlist & Financial Firewall', () => {
    
    it('should pass valid rows with only approved fields', () => {
        const validRow = {
            title: 'Fix AC',
            description: 'AC is blowing warm air',
            category: 'HVAC',
            scheduledDate: '2027-01-01',
            customerName: 'John Doe',
            customerPhone: '1234567890',
            siteName: 'Main Site',
            siteAddress: '123 Main St'
        };

        const result = validateUntrustedRow(validRow);
        expect(result.success).toBe(true);
        expect(result.data?.title).toBe('Fix AC');
    });

    it('should forcefully reject rows with unapproved financial fields (b2bPrice)', () => {
        const maliciousRow = {
            title: 'Fix AC',
            description: 'AC is blowing warm air',
            category: 'HVAC',
            scheduledDate: '2027-01-01',
            b2bPrice: 500, // MALICIOUS / UNKNOWN
            customerName: 'John Doe',
            customerPhone: '1234567890',
            siteName: 'Main Site',
            siteAddress: '123 Main St'
        };

        const result = validateUntrustedRow(maliciousRow);
        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('Unknown column detected');
    });

    it('should forcefully reject rows with paymentStatus', () => {
        const maliciousRow = {
            title: 'Fix AC',
            description: 'AC is blowing warm air',
            category: 'HVAC',
            scheduledDate: '2027-01-01',
            paymentStatus: 'release_pending', // MALICIOUS / UNKNOWN
            customerName: 'John Doe',
            customerPhone: '1234567890',
            siteName: 'Main Site',
            siteAddress: '123 Main St'
        };

        const result = validateUntrustedRow(maliciousRow);
        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('Unknown column detected');
    });
});
