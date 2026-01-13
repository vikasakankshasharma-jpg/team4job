
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/server-init';
import type { User } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export async function POST(req: NextRequest) {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  try {
    // 0. Auth Check via Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    let adminUser;
    try {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      if (!userDoc.exists) throw new Error("User not found");

      const userData = userDoc.data() as User;
      if (!userData.roles.includes('Admin')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      adminUser = userData;
    } catch (e) {
      console.error("Auth verification failed:", e);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (role !== 'Admin' && role !== 'Support Team') {
      return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
    }

    // 1. Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });

    // 2. Create user profile in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);

    const newUserProfile: Partial<User> = {
      id: userRecord.uid,
      name,
      email,
      mobile: '0000000000', // Placeholder
      roles: [role],
      memberSince: Timestamp.now() as any,
      status: 'active',
      avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
      realAvatarUrl: 'https://picsum.photos/seed/teammember/200/200', // Placeholder
      pincodes: { residential: '000000' }, // Placeholder
      address: {
        cityPincode: "000000",
        house: "N/A",
        street: "N/A"
      }
    };

    await userRef.set(newUserProfile);

    // 3. Log Admin Action
    const { logAdminAction } = await import('@/lib/admin-logger');
    await logAdminAction({
      adminId: adminUser.id,
      adminName: adminUser.name,
      adminEmail: adminUser.email,
      actionType: 'TEAM_MEMBER_ADDED',
      targetType: 'team',
      targetId: userRecord.uid,
      targetName: name,
      details: { role, email }
    });

    return NextResponse.json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error('Error creating team member:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'A user with this email address already exists.';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'The password must be at least 6 characters long.';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
