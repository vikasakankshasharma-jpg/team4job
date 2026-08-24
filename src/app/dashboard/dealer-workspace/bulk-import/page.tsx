import { BulkImportClient } from './bulk-import-client';

export default function BulkImportPage() {
    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2">Bulk Import Jobs</h1>
            <p className="text-gray-600 mb-8">Upload a CSV to batch import jobs. All jobs are imported as Drafts and require manual scheduling.</p>
            <BulkImportClient />
        </div>
    );
}
