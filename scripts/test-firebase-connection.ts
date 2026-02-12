
import admin from 'firebase-admin';
import * as path from 'path';

async function testConnection() {
    console.log('Testing Firebase Connection...');

    try {
        console.log('Admin object keys:', Object.keys(admin));

        // Handle potential ESM/CJS interop issues by checking default export
        const firebase = (admin as any).default || admin;

        if (!firebase.apps?.length) {
            console.log('Initializing new app...');
            // Check if we have credentials available or rely on ADC
            try {
                firebase.initializeApp({
                    credential: firebase.credential.applicationDefault(),
                    projectId: 'dodo-beta'
                });
            } catch (e: any) {
                console.log('Failed to init with ADC, checking GOOGLE_APPLICATION_CREDENTIALS env...');
                console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
                throw e;
            }
        }

        const db = firebase.firestore();
        console.log('Initialized Firestore. Attempting to list collections...');

        const collections = await db.listCollections();
        console.log('Success! Connected to Firestore.');
        console.log('Found collections:', collections.map((c: any) => c.id).join(', '));

    } catch (error) {
        console.error('Connection Failed:', error);
    }
}

testConnection();
