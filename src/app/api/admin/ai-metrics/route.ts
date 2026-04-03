import { NextResponse } from "next/server";
import { aiMetricsService } from "@/ai/services/AIMetricsService";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '7', 10);
        const logsLimit = parseInt(searchParams.get('logsLimit') || '20', 10);

        const [metrics, recentLogs] = await Promise.all([
            aiMetricsService.getAggregatedMetrics(days),
            aiMetricsService.getRecentLogs(logsLimit)
        ]);

        return NextResponse.json({
            metrics,
            recentLogs
        });
    } catch (error: any) {
        console.error("Error fetching AI metrics:", error);
        return NextResponse.json(
            { error: "Failed to fetch AI metrics" },
            { status: 500 }
        );
    }
}
