
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Force use of Emulators
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

if (!getApps().length) {
    initializeApp({ projectId: 'team4job-test' });
}

const db = getFirestore();
const auth = getAuth();

async function getOrCreateUser(email: string, name: string) {
    try {
        return await auth.getUserByEmail(email);
    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            return await auth.createUser({
                email,
                password: 'TestUser_2026!',
                displayName: name,
                emailVerified: true
            });
        }
        throw e;
    }
}

async function forceChat() {
    console.log('🚀 Direct Chat Injection with Auto-Seeding Starting...');
    
    // 1. Get or Create UIDs
    const client = await getOrCreateUser('giver_vip_v3@team4job.com', 'Priya VIP Giver');
    const pro = await getOrCreateUser('installer_pro_v3@team4job.com', 'Rajesh Pro Installer');
    
    console.log(`[ForceChat] Participants found/created: ${client.uid} and ${pro.uid}`);

    // 2. Create Conversation
    const convRef = db.collection('conversations').doc(`AUDIT_CHAT_${Date.now()}`);
    const now = Timestamp.now();
    
    await convRef.set({
        participants: [client.uid, pro.uid],
        createdAt: now,
        updatedAt: now,
        lastMessage: {
            text: 'System: Initialized for Audit Verification.',
            senderId: 'SYSTEM',
            createdAt: now
        }
    });
    
    // 3. Add initial message
    await convRef.collection('messages').add({
        text: 'Hello! I am confirming the chat is working for our audit.',
        senderId: client.uid,
        createdAt: now,
        status: 'sent'
    });

    console.log(`✅ Direct Chat Injected: ${convRef.id}`);
    process.exit(0);
}

forceChat().catch(e => {
    console.error('❌ Failed to force chat:', e);
    process.exit(1);
});
