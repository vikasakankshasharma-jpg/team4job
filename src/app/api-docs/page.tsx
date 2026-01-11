"use client";

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';
import { openApiSpec } from '@/lib/swagger';
import { Loader2 } from 'lucide-react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
});

export default function ApiDocsPage() {
    return (
        <div className="bg-white min-h-screen">
            <SwaggerUI spec={openApiSpec} />
        </div>
    );
}
