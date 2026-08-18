import { authService } from '../src/domains/auth/auth.service';
import { getAdminApp } from '../src/infrastructure/firebase/admin';

async function run() {
    try {
        console.log("Initializing admin app...");
        getAdminApp(); // Initializes Firebase admin
        
        console.log("Testing authService.signup...");
        const result = await authService.signup({
            name: 'Test Member',
            email: `test-${Date.now()}@example.com`,
            password: 'password123',
            mobile: '9999999999',
            role: 'Support Team' as any
        });
        
        console.log("Success:", result);
    } catch (e) {
        console.error("Caught Error:", e);
    }
}

run();
