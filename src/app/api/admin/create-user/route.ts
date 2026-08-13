// app/api/admin/create-user/route.ts - REFACTORED to use domain services

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/domains/auth/auth.service';
import { userService } from '@/domains/users/user.service';
import { getAdminAuth } from '@/infrastructure/firebase/admin';

import { Role, User } from '@/lib/types';
import { logAdminAction } from '@/lib/admin-logger';

export const dynamic = 'force-dynamic';

/**
 * Create admin/support team members
 * ✅ REFACTORED: Uses domain services  */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin authorization
    const admin = await verifyAdminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role !== 'Admin' && role !== 'Support Team') {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // 3. ✅ Use auth service instead of direct Firebase calls
    const { uid } = await authService.signup({
      name,
      email,
      password,
      mobile: '9999999999', // Placeholder for team members
      role: role as Role,
    });

    // 4. Mark email as verified for team members
    await authService.verifyEmail(uid);

    // 5. Log action
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name || 'Admin',
      adminEmail: admin.email,
      actionType: 'TEAM_MEMBER_ADDED',
      targetType: 'user',
      targetId: uid,
      targetName: name,
      details: { role },
    });


    return NextResponse.json({ success: true, uid });

  } catch (error: any) {
    console.error('CREATE_USER_ERROR:', error);
    // Silent failure in production to avoid leaking info

    // Handle specific errors
    let errorMessage = 'An unexpected error occurred';
    if (error.message?.includes('Email already registered')) {
      errorMessage = 'A user with this email already exists';
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Helper: Verify admin authentication
 */
async function verifyAdminAuth(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // ✅ Use user service to get user data
    const user = await userService.getProfile(decodedToken.uid);

    if (!user.roles?.includes('Admin')) {
      return null;
    }

    return user;
  } catch (error) {

    return null;
  }
}
