"use server";

import { cookies } from 'next/headers';

/**
 * Sets the auth-token cookie with HttpOnly flag for security
 */
export async function setAuthTokenAction(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 3600 // 1 hour
    });
}

/**
 * Clears the auth-token cookie
 */
export async function clearAuthTokenAction() {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
}
