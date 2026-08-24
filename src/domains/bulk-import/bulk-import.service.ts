import { getAdminDb } from '@/infrastructure/firebase/admin';
import { bulkImportRepository } from './bulk-import.repository';
import { validateUntrustedRow } from './bulk-import.schema';
import { bulkImportResolutionService } from './bulk-import.resolution.service';
import { bulkImportDuplicateService } from './bulk-import.duplicate.service';
import { UntrustedImportRow, StagedImportRow } from './bulk-import.types';
import * as crypto from 'crypto';

export class BulkImportService {
    
    async stageCsvUpload(dealerId: string, fileName: string, uploadedBy: string, rows: UntrustedImportRow[]): Promise<string> {
        const batchId = crypto.randomUUID();
        
        let validCount = 0;
        let rejectedCount = 0;
        let duplicateCount = 0;

        // Note: For huge files (10k+ rows) this loop should be chunked. 
        // For demonstration within standard limits, processing all.
        for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i];
            const validation = validateUntrustedRow(rawRow);
            
            const rowId = `row_${i}`;
            const stagedRow: StagedImportRow = {
                id: rowId,
                title: rawRow.title || '',
                description: rawRow.description || '',
                category: rawRow.category || '',
                scheduledDate: rawRow.scheduledDate || new Date(), // Fallback if invalid just for type, validation catches it
                
                customerResolutionStatus: 'NEW',
                siteResolutionStatus: 'NEW',
                isDuplicate: false,
                validationErrors: validation.errors,
                isReadyForCommit: false
            };

            if (validation.success && validation.data) {
                Object.assign(stagedRow, validation.data);
                
                // Resolution
                const custRes = await bulkImportResolutionService.resolveCustomer(dealerId, validation.data);
                stagedRow.customerResolutionStatus = custRes.status;
                stagedRow.resolvedCustomerId = custRes.id;

                const siteRes = await bulkImportResolutionService.resolveSite(dealerId, custRes.id, validation.data);
                stagedRow.siteResolutionStatus = siteRes.status;
                stagedRow.resolvedSiteId = siteRes.id;

                // Duplicate Check
                const dupCheck = await bulkImportDuplicateService.checkDuplicate(dealerId, validation.data, custRes.id, siteRes.id);
                stagedRow.isDuplicate = dupCheck.isDuplicate;
                stagedRow.duplicateReason = dupCheck.reason;

                stagedRow.isReadyForCommit = true;
                validCount++;
                if (dupCheck.isDuplicate) duplicateCount++;
            } else {
                rejectedCount++;
            }

            const cleanStagedRow = Object.fromEntries(
                Object.entries(stagedRow).filter(([_, v]) => v !== undefined)
            ) as any;
            await bulkImportRepository.saveStagedRow(dealerId, batchId, cleanStagedRow);
        }

        await bulkImportRepository.createBatch({
            id: batchId,
            dealerId,
            uploadedBy,
            fileName,
            rowCount: rows.length,
            validCount,
            rejectedCount,
            duplicateCount,
            status: 'STAGED',
            createdAt: new Date()
        });

        return batchId;
    }
}

export const bulkImportService = new BulkImportService();
