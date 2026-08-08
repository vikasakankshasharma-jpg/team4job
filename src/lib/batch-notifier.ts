import { getAdminDb } from '@/infrastructure/firebase/admin';
import { sendNotification } from '@/lib/notifications';

/**
 * Smart Batching Service for Job Alerts
 * Escalate notifications in batches to minimize WhatsApp template costs.
 */
export async function broadcastJobToPincode(jobId: string, pincode: string) {
    const db = getAdminDb();
    
    // 1. Find all available installers in this pincode, ordered by rating
    const snapshot = await db.collection('users')
        .where('role', '==', 'professional')
        .where('pincode', '==', pincode)
        .where('isAvailable', '==', true)
        .orderBy('rating', 'desc')
        .get();

    if (snapshot.empty) {
        console.warn(`[BatchNotifier] No installers found for job ${jobId} in pincode ${pincode}`);
        return;
    }

    const installers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    // 2. Take the Top 5
    const batchSize = 5;
    const currentBatch = installers.slice(0, batchSize);

    console.info(`[BatchNotifier] Broadcasting job ${jobId} to top ${currentBatch.length} installers in ${pincode}`);

    // 3. Send Escalation Waterfall Notification to the batch
    const promises = currentBatch.map(installer => {
        return sendNotification(
            installer.email,
            `New Job Available: ${jobId}`,
            `A new job in your area (${pincode}) is available. Tap here to bid!`,
            undefined,
            {
                userId: installer.id,
                phoneNumber: installer.mobile,
                fcmTokens: installer.fcmTokens || [],
                useEscalation: true,
                templateName: 'new_job_alert_pincode'
            }
        );
    });

    await Promise.all(promises);

    // Note: In a full production environment (like AWS SQS or Google Cloud Tasks), 
    // you would schedule a task here to run in 15 minutes. That task would check 
    // if the job was claimed, and if not, send to installers.slice(5, 10).
}
