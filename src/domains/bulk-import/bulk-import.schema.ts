import { z } from 'zod';
import { UntrustedImportRow, ValidatedImportRow } from './bulk-import.types';

// Strict schema definition - only approved business fields
const schema = z.object({
    jobExternalRef: z.string().optional().nullable(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.string().min(1, 'Category is required'),
    scheduledDate: z.preprocess((arg) => {
        if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
    }, z.date({ required_error: 'Valid scheduledDate is required' })),
    
    customerExternalRef: z.string().optional().nullable(),
    customerName: z.string().optional().nullable(),
    customerPhone: z.string().optional().nullable(),
    
    siteExternalRef: z.string().optional().nullable(),
    siteName: z.string().optional().nullable(),
    siteAddress: z.string().optional().nullable(),
})
.strict('Unknown column detected. CSV must only contain approved business fields.')
.refine(data => {
    // If no external ref, name and phone are required for new customer
    if (!data.customerExternalRef && (!data.customerName || !data.customerPhone)) {
        return false;
    }
    return true;
}, { message: 'customerName and customerPhone are required if customerExternalRef is omitted.', path: ['customerResolution'] })
.refine(data => {
    // If no external ref, name and address are required for new site
    if (!data.siteExternalRef && (!data.siteName || !data.siteAddress)) {
        return false;
    }
    return true;
}, { message: 'siteName and siteAddress are required if siteExternalRef is omitted.', path: ['siteResolution'] });

export function validateUntrustedRow(row: UntrustedImportRow): { success: boolean; data?: ValidatedImportRow; errors: string[] } {
    const parsed = schema.safeParse(row);

    if (!parsed.success) {
        return {
            success: false,
            errors: parsed.error.errors.map(e => e.message)
        };
    }

    const cleanData = Object.fromEntries(
        Object.entries(parsed.data).filter(([_, v]) => v != null)
    ) as ValidatedImportRow;

    return {
        success: true,
        data: cleanData,
        errors: []
    };
}
