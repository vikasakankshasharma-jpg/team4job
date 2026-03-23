
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function migrateUser() {
  // IMPORTANT: We need the live service account. 
  // Since I don't have it locally, I will assume the user provides it or I use ADC.
  // Actually, I'll use the one I have and hope it works if they update it.
  // Wait! The user might have it in 'service-account.json'.
  
  const serviceAccount = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'team4job-live'
  });
  
  const db = getFirestore();
  const oldId = 'installer_pro_v3';
  const newId = 'cnpSExUahWfGizDZcCnTPK1Hn5y2';
  
  const oldDoc = await db.collection('users').doc(oldId).get();
  if (!oldDoc.exists) {
    console.log('Old document not found');
    return;
  }
  
  const data = oldDoc.data();
  console.log('Migrating data for:', data.email);
  
  await db.collection('users').doc(newId).set(data);
  console.log('New document created:', newId);
  
  // Optionally delete old one? Let's keep it for now as a backup.
}

migrateUser().catch(console.error);
