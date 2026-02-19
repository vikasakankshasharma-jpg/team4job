(async () => {
  try {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.GOOGLE_CLOUD_PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dodo-beta';

    const adminApp = await import('firebase-admin/app');
    const { initializeApp, getApps } = adminApp;
    const authMod = await import('firebase-admin/auth');
    const firestoreMod = await import('firebase-admin/firestore');

    if (getApps().length === 0) {
      initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
      console.log('[SCRIPT] Firebase Admin initialized (emulator mode)');
    } else {
      console.log('[SCRIPT] Firebase Admin already initialized');
    }

    const auth = authMod.getAuth();
    const db = firestoreMod.getFirestore();

    const email = 'local_script_user@team4job.com';
    try {
      const user = await auth.createUser({ email, password: 'Test@1234', displayName: 'Local Script' });
      console.log('[SCRIPT] Created user:', user.uid);
      await db.collection('users').doc(user.uid).set({ email: user.email, createdAt: firestoreMod.Timestamp.now() });
      console.log('[SCRIPT] Wrote user doc');
    } catch (err) {
      console.error('[SCRIPT] Error creating user or writing doc:', err);
      process.exitCode = 2;
    }
  } catch (err) {
    console.error('[SCRIPT] Fatal error:', err);
    process.exitCode = 1;
  }
})();
