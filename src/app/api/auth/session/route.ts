import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * API Route to set/remove auth-token cookie.
 * This is used as a more resilient alternative to Server Actions 
 * for cookie synchronization, especially in CI/CD environments 
 * where CSRF protection can cause 400 Bad Request errors.
 */
export async function POST(request: Request) {
    try {
        const { token } = await request.json();
        const cookieStore = await cookies();

        if (token) {
            cookieStore.set('auth-token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 3600 // 1 hour
            });
            return NextResponse.json({ success: true });
        } else {
            cookieStore.delete('auth-token');
            return NextResponse.json({ success: true, message: 'Token removed' });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    return NextResponse.json({ success: true });
}
