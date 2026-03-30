import { getAdminDb } from "@/infrastructure/firebase/admin";
import { AILog, AIMetric } from "@/lib/types";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export const aiMetricsService = {
    /**
     * Log an AI interaction using Admin SDK.
     */
    logInteraction: async (log: Omit<AILog, "id">) => {
        try {
            const db = getAdminDb();
            await db.collection("ai_logs").add({
                ...log,
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (error) {
            // Failed to log AI interaction
        }
    },

    /**
     * Get recent AI logs for transparency.
     */
    getRecentLogs: async (limitCount = 50): Promise<AILog[]> => {
        try {
            const db = getAdminDb();
            const snapshot = await db.collection("ai_logs")
                .orderBy("timestamp", "desc")
                .limit(limitCount)
                .get();
            
            return snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            } as AILog));
        } catch (error) {
            return [];
        }
    },

    /**
     * Calculate aggregated metrics (Cost, Latency, Errors).
     */
    getAggregatedMetrics: async (days = 7): Promise<AIMetric[]> => {
        try {
            const db = getAdminDb();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const snapshot = await db.collection("ai_logs")
                .where("timestamp", ">=", Timestamp.fromDate(startDate))
                .get();
            
            const logs = snapshot.docs.map(doc => doc.data() as AILog);

            // Group by date
            const metricsMap = new Map<string, AIMetric>();

            logs.forEach(log => {
                const date = log.timestamp instanceof Timestamp
                    ? log.timestamp.toDate().toISOString().split('T')[0]
                    : new Date(log.timestamp as any).toISOString().split('T')[0];

                if (!metricsMap.has(date)) {
                    metricsMap.set(date, {
                        date,
                        totalCostUsd: 0,
                        totalRequests: 0,
                        averageLatencyMs: 0,
                        errorCount: 0
                    });
                }

                const metric = metricsMap.get(date)!;
                metric.totalCostUsd += log.costUsd || 0;
                metric.totalRequests += 1;
                metric.errorCount += log.success ? 0 : 1;
                metric.averageLatencyMs =
                    ((metric.averageLatencyMs * (metric.totalRequests - 1)) + log.latencyMs) / metric.totalRequests;
            });

            return Array.from(metricsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            return [];
        }
    }
};
