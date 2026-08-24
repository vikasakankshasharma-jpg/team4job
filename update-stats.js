const fs = require('fs');
const file = 'src/app/actions/dashboard.actions.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /export async function getDealerDashboardStatsAction[\s\S]*?^}/m;

const newFunction = \export async function getDealerDashboardStatsAction(dealerId: string) {
    try {
        const { requireAuth } = await import('@/lib/auth-server');
        await requireAuth(dealerId);
        const { getAdminDb } = await import('@/infrastructure/firebase/admin');
        const db = getAdminDb();
        
        // Use aggregated queries for scalability
        const now = new Date();
        const jobsRef = db.collection('jobs').where('dealerId', '==', dealerId);
        
        const [
            actionRequiredCountSnap,
            activeCountSnap,
            completedCountSnap,
            disputedCountSnap,
            
            pendingAwardsSnap,
            noMatchesSnap,
            pendingPaymentsSnap,
            maintenanceDueSnap
        ] = await Promise.all([
            jobsRef.where('status', 'in', ['reviewing', 'open']).count().get(),
            jobsRef.where('status', 'in', ['in_progress', 'awarded']).count().get(),
            jobsRef.where('status', '==', 'completed').count().get(),
            jobsRef.where('status', '==', 'disputed').count().get(),
            
            jobsRef.where('status', '==', 'reviewing').limit(10).get(),
            jobsRef.where('status', '==', 'open').limit(20).get(),
            jobsRef.where('paymentStatus', 'in', ['payment_pending', 'release_pending']).limit(10).get(),
            
            db.collection('dealers').doc(dealerId).collection('serviceSites')
              .where('history.nextDueDate', '<=', now)
              .limit(10).get()
        ]);
        
        const pendingAwards = pendingAwardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const openJobs = noMatchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const noMatches = openJobs.filter(j => !j.bids || j.bids.length === 0);
        const pendingPayments = pendingPaymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Extra validation for maintenance due
        const rawSites = maintenanceDueSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const maintenanceDueSites = rawSites.filter(site => site.history?.totalJobs > 0);

        return JSON.parse(JSON.stringify({
            success: true,
            data: {
                metrics: {
                    actionRequired: actionRequiredCountSnap.data().count,
                    active: activeCountSnap.data().count,
                    completed: completedCountSnap.data().count,
                    disputed: disputedCountSnap.data().count,
                },
                queues: {
                    pendingAwards,
                    noMatches,
                    pendingPayments,
                    maintenanceDueSites
                }
            }
        }));
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}\;

if (code.match(regex)) {
    code = code.replace(regex, newFunction);
    fs.writeFileSync(file, code);
    console.log("Updated getDealerDashboardStatsAction successfully");
} else {
    console.log("Could not find getDealerDashboardStatsAction");
}
