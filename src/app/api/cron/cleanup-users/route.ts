import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/infrastructure/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

/**
 * Cleanup users cron job - Purges PII of users deactivated for >30 days
 * GDPR / CCPA / DPDP compliance
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Verify cron secret
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const usersSnap = await db
      .collection('users')
      .where('status', '==', 'deactivated')
      .where('deactivatedAt', '<=', Timestamp.fromDate(thirtyDaysAgo))
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ message: 'No deactivated users to clean up' });
    }

    const results = [];
    for (const doc of usersSnap.docs) {
      const uid = doc.id;
      
      // Anonymize user details
      await doc.ref.update({
        name: 'Deactivated User',
        email: `deactivated_${uid}@deleted.team4job.com`,
        mobile: '0000000000',
        avatarUrl: '',
        realAvatarUrl: '',
        status: 'deleted',
        pincodes: {
          residential: '000000',
        },
        address: {
          house: '',
          street: '',
          cityPincode: '000000',
        },
        addresses: {
          residence: {
            house: '',
            street: '',
            cityPincode: '000000',
          },
        },
        panNumber: FieldValue.delete(),
        isPanVerified: FieldValue.delete(),
        aadharLast4: FieldValue.delete(),
        kycAddress: FieldValue.delete(),
        gstin: FieldValue.delete(),
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      // Delete Firebase Auth record
      try {
        const { getAuth } = await import('firebase-admin/auth');
        await getAuth().deleteUser(uid);
      } catch (authError: any) {
        // Ignore if user is already deleted from Auth
        if (authError.code !== 'auth/user-not-found') {
          console.error(`Failed to delete Auth record for user ${uid}:`, authError);
        }
      }
      
      results.push(uid);
    }

    return NextResponse.json({ processed: results.length, userIds: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
