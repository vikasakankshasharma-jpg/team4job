/**
 * User Data Cleanup Script
 * Fixes Firestore user documents with missing required fields
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();

interface UserIssue {
    id: string;
    issues: string[];
    data: any;
}

async function cleanupUsers() {
    console.log('🔍 Starting user data cleanup...\n');

    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    const usersWithIssues: UserIssue[] = [];
    let totalUsers = 0;
    let fixedUsers = 0;

    snapshot.forEach((doc) => {
        totalUsers++;
        const data = doc.data();
        const issues: string[] = [];

        // Check for missing required fields
        if (!data.name || data.name.trim() === '') {
            issues.push('Missing or empty name');
        }
        if (!data.email || data.email.trim() === '') {
            issues.push('Missing or empty email');
        }
        if (!data.roles || !Array.isArray(data.roles) || data.roles.length === 0) {
            issues.push('Missing or empty roles array');
        }
        if (!data.memberSince) {
            issues.push('Missing memberSince timestamp');
        }

        if (issues.length > 0) {
            usersWithIssues.push({
                id: doc.id,
                issues,
                data,
            });
        }
    });

    console.log(`📊 Total users: ${totalUsers}`);
    console.log(`⚠️  Users with issues: ${usersWithIssues.length}\n`);

    if (usersWithIssues.length === 0) {
        console.log('✅ No users with data issues found. All good!');
        return;
    }

    console.log('📝 Users with issues:\n');
    usersWithIssues.forEach((user, index) => {
        console.log(`${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.data.email || 'MISSING'}`);
        console.log(`   Name: ${user.data.name || 'MISSING'}`);
        console.log(`   Issues: ${user.issues.join(', ')}`);
        console.log('');
    });

    // Ask for confirmation before fixing
    console.log('🔧 Would you like to fix these issues? (This script will auto-fix)\n');
    console.log('Fixes that will be applied:');
    console.log('  - Missing name: Set to "User [UID]"');
    console.log('  - Missing email: Skip (cannot fix without valid email)');
    console.log('  - Missing roles: Set to ["Job Giver"]');
    console.log('  - Missing memberSince: Set to current timestamp\n');

    // Auto-proceed with fixes
    for (const user of usersWithIssues) {
        const updates: any = {};

        // Fix missing name
        if (!user.data.name || user.data.name.trim() === '') {
            updates.name = `User ${user.id.substring(0, 8)}`;
        }

        // Fix missing roles
        if (!user.data.roles || !Array.isArray(user.data.roles) || user.data.roles.length === 0) {
            updates.roles = ['Job Giver']; // Default role
        }

        // Fix missing memberSince
        if (!user.data.memberSince) {
            updates.memberSince = new Date();
        }

        // Skip users with missing email (critical field)
        if (!user.data.email || user.data.email.trim() === '') {
            console.log(`⏭️  Skipping user ${user.id} - missing email (critical field)`);
            continue;
        }

        // Apply fixes
        if (Object.keys(updates).length > 0) {
            await usersRef.doc(user.id).update(updates);
            fixedUsers++;
            console.log(`✅ Fixed user ${user.id}: ${Object.keys(updates).join(', ')}`);
        }
    }

    console.log(`\n✨ Cleanup complete!`);
    console.log(`   Fixed: ${fixedUsers} users`);
    console.log(`   Skipped: ${usersWithIssues.length - fixedUsers} users (critical issues)\n`);
}

// Run the cleanup
cleanupUsers()
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    });
