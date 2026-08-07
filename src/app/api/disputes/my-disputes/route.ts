import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/infrastructure/firebase/admin';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const isAdmin = userDoc.exists && (userData?.role === 'admin' || userData?.roles?.includes('Admin'));
        
        console.log('[my-disputes] API Hit by user:', userId, 'isAdmin:', isAdmin);

        let disputesMap = new Map();

        if (isAdmin) {
            const allDisputes = await db.collection('disputes').get();
            allDisputes.forEach(doc => {
                disputesMap.set(doc.id, { id: doc.id, ...doc.data() });
            });
        } else {
            const [reqQuery, clientQuery, profQuery] = await Promise.all([
                db.collection('disputes').where('requesterId', '==', userId).get(),
                db.collection('disputes').where('parties.clientId', '==', userId).get(),
                db.collection('disputes').where('parties.professionalId', '==', userId).get()
            ]);

            [reqQuery, clientQuery, profQuery].forEach(querySnapshot => {
                querySnapshot.forEach(doc => {
                    if (!disputesMap.has(doc.id)) {
                        disputesMap.set(doc.id, { id: doc.id, ...doc.data() });
                    }
                });
            });
        }

        const disputes = Array.from(disputesMap.values());

        // Fetch involved users
        const userIds = new Set<string>();
        disputes.forEach(d => {
            if (d.requesterId) userIds.add(d.requesterId);
            if (d.parties?.clientId) userIds.add(d.parties.clientId);
            if (d.parties?.professionalId) userIds.add(d.parties.professionalId);
        });

        const involvedUsers: Record<string, any> = {};
        const userFetchPromises = Array.from(userIds).map(async (uid) => {
            const uDoc = await db.collection('users').doc(uid).get();
            if (uDoc.exists) {
                involvedUsers[uid] = uDoc.data();
            }
        });

        await Promise.all(userFetchPromises);

        console.log(`[my-disputes] Returning ${disputes.length} disputes for user ${userId}`);
        return NextResponse.json({ success: true, disputes, involvedUsers });

    } catch (error: any) {
        console.error('[my-disputes] API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
