'use client';
import { useState, useRef } from 'react';
import { stageCsvUploadAction, getImportPreviewAction, confirmImportAction, commitImportAction, getBatchResultAction } from '@/app/actions/bulk-import.actions';
import { Button } from '@/components/ui/button';

function parseCSV(text: string) {
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        // Basic parser, doesn't handle quotes with commas inside, but good enough for demo
        const row = lines[i].split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
            if (row[idx]) obj[h] = row[idx];
        });
        data.push(obj);
    }
    return data;
}

export function BulkImportClient() {
    const [step, setStep] = useState<'UPLOAD' | 'PREVIEW' | 'COMMITTING' | 'RESULT'>('UPLOAD');
    const [batchId, setBatchId] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) return;
        
        setLoading(true);
        setError(null);
        try {
            const text = await file.text();
            const rows = parseCSV(text);
            
            const res = await stageCsvUploadAction(file.name, rows);
            setBatchId(res.batchId);
            
            const preview = await getImportPreviewAction(res.batchId);
            setPreviewData(preview);
            setStep('PREVIEW');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!batchId) return;
        setLoading(true);
        setError(null);
        try {
            await confirmImportAction(batchId);
            setStep('COMMITTING');
            // Execute commit and wait
            await commitImportAction(batchId);
            
            const res = await getBatchResultAction(batchId);
            setPreviewData(res); // Has final batch status
            setStep('RESULT');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow border p-6">
            {error && <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">{error}</div>}

            {step === 'UPLOAD' && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Step 1: Upload CSV</h2>
                    <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
                        <input type="file" ref={fileRef} accept=".csv" className="mb-4" />
                        <div>
                            <Button onClick={handleUpload} disabled={loading}>
                                {loading ? 'Processing...' : 'Upload & Validate'}
                            </Button>
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        <p><strong>Note:</strong> Financial fields (price, cost, margin) are strictly prohibited and will cause rows to be rejected.</p>
                    </div>
                </div>
            )}

            {step === 'PREVIEW' && previewData && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Step 2: Preview Validation</h2>
                    
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 rounded border">
                            <div className="text-sm text-gray-500">Total Rows</div>
                            <div className="text-2xl font-bold">{previewData.batch.rowCount}</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded border border-green-200">
                            <div className="text-sm text-green-700">Ready to Import</div>
                            <div className="text-2xl font-bold text-green-700">{previewData.batch.validCount}</div>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                            <div className="text-sm text-yellow-700">Duplicates</div>
                            <div className="text-2xl font-bold text-yellow-700">{previewData.batch.duplicateCount}</div>
                        </div>
                        <div className="p-4 bg-red-50 rounded border border-red-200">
                            <div className="text-sm text-red-700">Rejected</div>
                            <div className="text-2xl font-bold text-red-700">{previewData.batch.rejectedCount}</div>
                        </div>
                    </div>

                    <div className="mb-6 max-h-[400px] overflow-auto border rounded">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Title</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">Site</th>
                                    <th className="p-3">Errors / Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.rows.map((row: any) => (
                                    <tr key={row.id} className="border-t">
                                        <td className="p-3">
                                            {row.isReadyForCommit ? (
                                                row.isDuplicate ? <span className="text-yellow-600 font-medium">Duplicate</span> : <span className="text-green-600 font-medium">Ready</span>
                                            ) : (
                                                <span className="text-red-600 font-medium">Rejected</span>
                                            )}
                                        </td>
                                        <td className="p-3">{row.title}</td>
                                        <td className="p-3">
                                            {row.customerName} <br />
                                            <span className="text-xs text-gray-500">[{row.customerResolutionStatus}]</span>
                                        </td>
                                        <td className="p-3">
                                            {row.siteAddress} <br />
                                            <span className="text-xs text-gray-500">[{row.siteResolutionStatus}]</span>
                                        </td>
                                        <td className="p-3 text-red-600 max-w-[200px] truncate" title={row.validationErrors?.join(', ')}>
                                            {row.validationErrors?.join(', ') || row.duplicateReason}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => setStep('UPLOAD')}>Cancel</Button>
                        <Button onClick={handleConfirm} disabled={loading || previewData.batch.validCount === 0}>
                            {loading ? 'Committing...' : 'Confirm & Commit Import'}
                        </Button>
                    </div>
                </div>
            )}

            {step === 'COMMITTING' && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold">Committing Batch...</h2>
                    <p className="text-gray-500">Please wait while jobs are being drafted safely.</p>
                </div>
            )}

            {step === 'RESULT' && previewData && (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Import Result: {previewData.batch.status}</h2>
                    <p className="text-gray-600 mb-6">Your jobs have been processed into the Dealer Command Center as Drafts.</p>
                    
                    <div className="flex gap-4">
                        <Button onClick={() => setStep('UPLOAD')}>Import Another File</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
