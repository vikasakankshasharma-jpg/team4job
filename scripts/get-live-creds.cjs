const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(process.cwd(), 'src/lib/firebase/service-account.json'));

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function getAdminCreds() {
    console.log('Querying emailVerifyCodes...');
    const verifyCodesRef = db.collection('emailVerifyCodes');
    const snapshot = await verifyCodesRef.limit(5).get();
    
    snapshot.forEach(doc => {
      console.log(doc.id, '=>', doc.data());
    });

    console.log('\nQuerying real admins in users collection...');
    const usersRef = await db.collection('users').where('roles', 'array-contains', 'Admin').get();
    if (usersRef.empty) {
        console.log('No admins found.');
    }
    for (let doc of usersRef.docs) {
       console.log('Admin User:', doc.data().email, doc.data().roles);
    }
    
    console.log('\nFetching top 3 test users...');
    const docs = await db.collection('users').limit(3).get();
    docs.forEach(doc => {
       console.log('User:', doc.data().email, doc.id);
    });

}
getAdminCreds().catch(console.error);
