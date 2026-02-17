import { db } from "@/infrastructure/firebase/client"; // Use client SDK for MVP, move to admin SDK later if needed for reliability
import { collection, query, where, getDocs, orderBy, limit, Timestamp, addDoc } from "firebase/firestore";
import { AILog, AIMetric } from "@/lib/types";

export const aiMetricsService = {
    /**
     * Log an AI interaction.
     * In a real app, this should be done via a server-side queue to avoid blocking.
     */
    logInteraction: async (log: Omit<AILog, "id">) => {
        try {
            await addDoc(collection(db, "ai_logs"), log);
        } catch (error) {
            console.error("Failed to log AI interaction:", error);
        }
    },

    /**
     * Get recent AI logs for transparency.
     */
    getRecentLogs: async (limitCount = 50): Promise<AILog[]> => {
        try {
            const logsRef = collection(db, "ai_logs");
            const q = query(logsRef, orderBy("timestamp", "desc"), limit(limitCount));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AILog));
        } catch (error) {
            console.error("Failed to fetch AI logs:", error);
            return [];
        }
    },

    /**
     * Calculate aggregated metrics (Cost, Latency, Errors).
     * For Phase 0, we calculate this on-the-fly from logs.
     * In Phase 2, we should pre-aggregate this into 'ai_daily_metrics' collection.
     */
    getAggregatedMetrics: async (days = 7): Promise<AIMetric[]> => {
        try {
            const logsRef = collection(db, "ai_logs");
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const q = query(logsRef, where("timestamp", ">=", Timestamp.fromDate(startDate)));
            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(doc => doc.data() as AILog);

            // Group by date
            const metricsMap = new Map<string, AIMetric>();

            logs.forEach(log => {
                const date = log.timestamp instanceof Timestamp
                    ? log.timestamp.toDate().toISOString().split('T')[0]
                    : new Date(log.timestamp).toISOString().split('T')[0];

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
                // Running average for latency
                metric.averageLatencyMs =
                    ((metric.averageLatencyMs * (metric.totalRequests - 1)) + log.latencyMs) / metric.totalRequests;
            });

            return Array.from(metricsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error("Failed to calculate AI metrics:", error);
            return [];
        }
    }
};
