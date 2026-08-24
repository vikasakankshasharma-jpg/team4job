'use server';

import { getAuthDealerId } from '@/infrastructure/auth/server-auth';
import { bulkImportService } from '@/domains/bulk-import/bulk-import.service';
import { bulkImportRepository } from '@/domains/bulk-import/bulk-import.repository';
import { bulkImportCommitService } from '@/domains/bulk-import/bulk-import.commit.service';
import { UntrustedImportRow } from '@/domains/bulk-import/bulk-import.types';
import * as crypto from 'crypto';

export async function stageCsvUploadAction(fileName: string, rows: UntrustedImportRow[]) {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');
    
    // In production, limit max rows here (e.g. 500 or 1000) per request
    if (rows.length > 2000) throw new Error('File too large. Max 2000 rows allowed.');
    
    // Using a hardcoded userId for now, replace with actual auth user
    const batchId = await bulkImportService.stageCsvUpload(dealerId, fileName, 'dealer_user', rows);
    return { batchId };
}

export async function getImportPreviewAction(batchId: string) {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');

    const batch = await bulkImportRepository.getBatch(dealerId, batchId);
    if (!batch) throw new Error('Batch not found');

    const rows = await bulkImportRepository.getStagedRows(dealerId, batchId, undefined, 100); // return top 100 for preview
    
    return { batch, rows };
}

export async function confirmImportAction(batchId: string) {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');

    const batch = await bulkImportRepository.getBatch(dealerId, batchId);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'STAGED') throw new Error('Batch already processed or confirmed');

    await bulkImportRepository.updateBatchStatus(dealerId, batchId, { status: 'CONFIRMED' });
    return { success: true };
}

export async function commitImportAction(batchId: string) {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');

    const lockId = crypto.randomUUID();
    await bulkImportCommitService.commitBatch(dealerId, batchId, lockId);
    
    return { success: true };
}

export async function getBatchResultAction(batchId: string) {
    const dealerId = await getAuthDealerId();
    if (!dealerId) throw new Error('Unauthorized');

    const batch = await bulkImportRepository.getBatch(dealerId, batchId);
    return { batch };
}
