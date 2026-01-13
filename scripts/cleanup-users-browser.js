/**
 * User Data Cleanup Script (Browser-based)
 * Run this in the browser console at localhost:3000/dashboard
 * 
 * Instructions:
 * 1. Log in as Admin
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

(async function cleanupUserData() {
    console.log('🔍 Starting user data cleanup...\n');

    // Get Firebase instances from the window (assuming they're available)
    const { collection, getDocs, updateDoc, doc } = window.firestoreExports || {};

    if (!collection) {
        console.error('❌ Firebase Firestore not available. Make sure you are logged in and on the dashboard.');
        return;
    }

    try {
        // Import from firebase/firestore if not already available
        const { getFirestore } = await import('firebase/firestore');
        const { getAuth } = await import('firebase/auth');

        // Get Firebase app from the page
        const auth = getAuth();
        const db = getFirestore();

        if (!auth.currentUser) {
            console.error('❌ Not logged in. Please log in first.');
            return;
        }

        console.log('📊 Fetching all users...');
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const usersWithIssues = [];
        let totalUsers = 0;

        snapshot.forEach((docSnapshot) => {
            totalUsers++;
            const data = docSnapshot.data();
            const issues = [];

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
                    id: docSnapshot.id,
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

        // Ask for confirmation
        const shouldFix = confirm(
            `Found ${usersWithIssues.length} users with data issues.\n\n` +
            `Fixes that will be applied:\n` +
            `• Missing name: Set to "User [UID]"\n` +
            `• Missing roles: Set to ["Job Giver"]\n` +
            `• Missing memberSince: Set to current date\n\n` +
            `Proceed with fixes?`
        );

        if (!shouldFix) {
            console.log('❌ Cleanup cancelled by user.');
            return;
        }

        let fixedUsers = 0;

        for (const user of usersWithIssues) {
            const updates = {};

            // Fix missing name
            if (!user.data.name || user.data.name.trim() === '') {
                updates.name = `User ${user.id.substring(0, 8)}`;
            }

            // Fix missing roles
            if (!user.data.roles || !Array.isArray(user.data.roles) || user.data.roles.length === 0) {
                updates.roles = ['Job Giver'];
            }

            // Fix missing memberSince
            if (!user.data.memberSince) {
                updates.memberSince = new Date();
            }

            // Skip users with missing email
            if (!user.data.email || user.data.email.trim() === '') {
                console.log(`⏭️  Skipping user ${user.id} - missing email (critical field)`);
                continue;
            }

            // Apply fixes
            if (Object.keys(updates).length > 0) {
                const userRef = doc(db, 'users', user.id);
                await updateDoc(userRef, updates);
                fixedUsers++;
                console.log(`✅ Fixed user ${user.id}: ${Object.keys(updates).join(', ')}`);
            }
        }

        console.log(`\n✨ Cleanup complete!`);
        console.log(`   Fixed: ${fixedUsers} users`);
        console.log(`   Skipped: ${usersWithIssues.length - fixedUsers} users\n`);

        // Reload the page to see changes
        if (fixedUsers > 0) {
            const shouldReload = confirm('Reload the page to see changes?');
            if (shouldReload) {
                window.location.reload();
            }
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
})();
