import { platformEventEmitter } from '@/lib/events/event-emitter';
import { PlatformEvent } from '@/lib/events/event-types';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { notificationService } from './notification.service';

export async function notificationConsumer(event: PlatformEvent): Promise<void> {
  try {
    const db = getAdminDb();
    let notificationData: any = null;

    if (event.name === 'case.approval_requested') {
      const payload = event.payload as { caseId: string; requesterId: string };
      notificationData = {
        title: 'Bypass Approval Requested',
        message: `Case ${payload.caseId.substring(0,8)} requires a secondary dual-control approval bypass signoff.`,
        type: 'FINOPS_APPROVAL_REQUEST',
        priority: 'high',
        userId: 'admin_broadcast'
      };
    } else if (event.name === 'case.approved') {
      const payload = event.payload as { requestId: string; actionType: string };
      notificationData = {
        title: 'Bypass Overrides Approved',
        message: `Dual-control override action "${payload.actionType}" was authorized and executed.`,
        type: 'FINOPS_APPROVAL_GRANTED',
        priority: 'high',
        userId: 'admin_broadcast'
      };
    } else if (event.name === 'case.rejected') {
      const payload = event.payload as { requestId: string; actionType: string };
      notificationData = {
        title: 'Bypass Overrides Rejected',
        message: `Dual-control override request for "${payload.actionType}" was rejected.`,
        type: 'FINOPS_APPROVAL_DENIED',
        priority: 'high',
        userId: 'admin_broadcast'
      };
    }
    
    // New Job Events for Communication
    else if (event.name === 'job.created') {
        const payload = event.payload as { jobId: string; clientId: string };
        const jobDoc = await db.collection('jobs').doc(payload.jobId).get();
        if (jobDoc.exists) {
            const jobData = jobDoc.data()!;
            // Safely extract the 6-digit pincode from the cityPincode string (e.g. "110001, Connaught Place")
            const cityPincode = jobData.address?.cityPincode || '';
            const pincodeMatch = cityPincode.match(/\d{6}/);
            const pincode = pincodeMatch ? pincodeMatch[0] : null;
            
            if (pincode) {
                // Find professionals in this pincode
                const prosSnapshot = await db.collection('users')
                    .where('roles', 'array-contains', 'Professional')
                    .get();
                
                const localPros = prosSnapshot.docs
                  .map(doc => ({ id: doc.id, ...doc.data() }))
                  .filter((pro: any) => pro.pincodes?.residential === pincode || pro.pincodes?.business === pincode || pro.address?.cityPincode?.includes(pincode));

                // Send notification to each professional in the area
                for (const pro of localPros) {
                    await notificationService.sendNotificationEscalated({
                        to: pro.email,
                        phoneNumber: pro.mobile,
                        subject: 'New Job Available in Your Area!',
                        text: `A new job for ${jobData.category} has just been posted in ${pincode}. Open the app to bid now!`,
                        userId: pro.id,
                        fcmTokens: pro.fcmTokens || [],
                        useEscalation: true
                    });
                }
            }
        }
    }
    
    else if (event.name === 'bid.placed') {
        const payload = event.payload as { bidId: string; jobId: string; professionalId: string; clientId: string };
        const clientDoc = await db.collection('users').doc(payload.clientId).get();
        const proDoc = await db.collection('users').doc(payload.professionalId).get();
        
        if (clientDoc.exists && proDoc.exists) {
            const client = clientDoc.data()!;
            const pro = proDoc.data()!;
            
            await notificationService.sendNotificationEscalated({
                to: client.email,
                phoneNumber: client.mobile,
                subject: 'New Bid Received!',
                text: `${pro.name} has just placed a bid on your job. Open the app to review their profile and pricing.`,
                userId: clientDoc.id,
                fcmTokens: client.fcmTokens || [],
                useEscalation: true
            });
        }
    }

    else if (event.name === 'escrow.funded') {
        const payload = event.payload as { transactionId: string; jobId: string };
        const jobDoc = await db.collection('jobs').doc(payload.jobId).get();
        
        if (jobDoc.exists) {
            const jobData = jobDoc.data()!;
            const awardedProId = jobData.awardedTo;
            if (awardedProId) {
                const proDoc = await db.collection('users').doc(awardedProId).get();
                if (proDoc.exists) {
                    const pro = proDoc.data()!;
                    await notificationService.sendNotificationEscalated({
                        to: pro.email,
                        phoneNumber: pro.mobile,
                        subject: 'Job Awarded - Escrow Funded!',
                        text: `Congratulations! The client has funded the escrow for the ${jobData.category} job. You can now proceed to the site and start the work.`,
                        userId: proDoc.id,
                        fcmTokens: pro.fcmTokens || [],
                        useEscalation: true
                    });
                }
            }
        }
    }

    if (notificationData) {
      await db.collection('notifications').add({
        ...notificationData,
        createdAt: Timestamp.now(),
        read: false
      });
    }
  } catch (error) {
    console.error('Notification Consumer Error:', error);
  }
}

// Register
platformEventEmitter.subscribe(notificationConsumer);
