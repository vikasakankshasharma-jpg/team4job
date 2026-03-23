
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function inspectUser() {
  const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'team4job-live'
  });
  
  const db = getFirestore();
  
  const snapshot = await db.collection('users').where('email', '==', 'installer_pro_v3@team4job.com').get();
  
  if (snapshot.empty) {
    console.log('User not found');
    return;
  }
  
  const doc = snapshot.docs[0];
  console.log('--- USER INSPECTION ---');
  console.log('User ID:', doc.id);
  console.log('Roles:', JSON.stringify(doc.data().roles));
  console.log('Name:', doc.data().name);
  console.log('-----------------------');
}

inspectUser().catch(console.error);
