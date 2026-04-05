const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyA788RVwnOv9P-TD3ID3IMWnlxDFaYHRgk",
  authDomain: "team4job-live.firebaseapp.com",
  projectId: "team4job-live"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testLogin() {
    console.log("Testing Admin login...");
    try {
        const u1 = await signInWithEmailAndPassword(auth, 'vikasakankshasharma_v3@gmail.com', 'Admin_Pass2026!');
        console.log("✅ Admin login successful:", u1.user.uid);
    } catch (e) {
        console.error("❌ Admin login failed:", e.message);
    }

    console.log("\nTesting Client login...");
    try {
        const u2 = await signInWithEmailAndPassword(auth, 'giver_vip_v3@team4job.com', 'TestUser_2026!');
        console.log("✅ Client login successful:", u2.user.uid);
    } catch (e) {
        console.error("❌ Client login failed:", e.message);
    }
    
    console.log("\nTesting Pro login...");
    try {
        const u3 = await signInWithEmailAndPassword(auth, 'installer_pro_v3@team4job.com', 'TestUser_2026!');
        console.log("✅ Pro login successful:", u3.user.uid);
    } catch (e) {
        console.error("❌ Pro login failed:", e.message);
    }
    
    process.exit(0);
}

testLogin();
