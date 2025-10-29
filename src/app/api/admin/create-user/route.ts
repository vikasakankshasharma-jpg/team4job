
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase/server-init';
import type { User } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const auth = getAuth(adminApp);
const db = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    // In a real app, you MUST add authentication here to ensure only an admin can call this endpoint.
    // For now, we'll proceed assuming the caller is authorized.
    
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (role !== 'Admin' && role !== 'Support Team') {
      return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
    }

    // 1. Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });

    // 2. Create user profile in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);

    const newUserProfile: User = {
      id: userRecord.uid,
      name,
      email,
      mobile: '0000000000', // Placeholder
      roles: [role],
      memberSince: Timestamp.now(),
      status: 'active',
      avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
      realAvatarUrl: 'https://picsum.photos/seed/teammember/200/200', // Placeholder
      pincodes: { residential: '000000' }, // Placeholder
      address: {
        cityPincode: "000000",
        fullAddress: "Address not set",
        house: "N/A",
        street: "N/A"
      }
    };
    
    await userRef.set(newUserProfile);

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

