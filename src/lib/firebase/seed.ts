
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { jobs as mockJobs } from '../data';
import { users as mockUsers } from '../data';
import type { Job, User } from '../types';

config();

async function seedDatabase() {
  try {
    console.log('Initializing Firebase Admin SDK...');
    
    // Construct credentials from individual environment variables
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace the escaped newlines in the private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error("Missing Firebase environment variables (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY). Please check your .env file.");
    }

    initializeApp({
      credential: cert(serviceAccount as any),
      projectId: serviceAccount.projectId,
    });
    
    const db = getFirestore();
    console.log('Firebase Admin SDK initialized successfully.');

    const batch = db.batch();

    // 1. Seed Users
    console.log('Preparing to seed users...');
    mockUsers.forEach((user: Omit<User, 'memberSince'> & { memberSince: Date | string }) => {
      const userRef = db.collection('users').doc(user.id);
      const userData = {
        ...user,
        memberSince: Timestamp.fromDate(new Date(user.memberSince)),
      };
      // Omit sensitive aadharData if it exists
      if (userData.installerProfile?.aadharData) {
        delete userData.installerProfile.aadharData;
      }
      batch.set(userRef, userData);
    });
    console.log(`${mockUsers.length} users prepared for batch write.`);

    // 2. Seed Jobs
    console.log('Preparing to seed jobs...');
    mockJobs.forEach((job: Omit<Job, 'postedAt' | 'deadline' | 'jobStartDate' | 'bids' | 'comments' | 'jobGiver' | 'awardedInstaller'> & { postedAt: any; deadline: any; jobStartDate: any; bids: any[]; comments: any[]; jobGiver: any; awardedInstaller?: any }) => {
      const jobRef = db.collection('jobs').doc(job.id);

      const jobGiverRef = db.collection('users').doc(job.jobGiver.id);
      
      let awardedInstallerRef = null;
      if (job.awardedInstaller) {
        const awardedInstallerId = typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller.id;
        awardedInstallerRef = db.collection('users').doc(awardedInstallerId);
      }


      const bidsWithRefs = job.bids.map(bid => ({
        ...bid,
        installer: db.collection('users').doc(bid.installer.id),
        timestamp: Timestamp.fromDate(new Date(bid.timestamp)),
      }));

      const commentsWithRefs = job.comments.map(comment => ({
        ...comment,
        author: db.collection('users').doc(comment.author.id),
        timestamp: Timestamp.fromDate(new Date(comment.timestamp)),
      }));

      const jobData: any = {
        ...job,
        postedAt: Timestamp.fromDate(new Date(job.postedAt)),
        deadline: Timestamp.fromDate(new Date(job.deadline)),
        jobStartDate: job.jobStartDate ? Timestamp.fromDate(new Date(job.jobStartDate)) : null,
        jobGiver: jobGiverRef,
        bids: bidsWithRefs,
        comments: commentsWithRefs,
      };

      if (awardedInstallerRef) {
        jobData.awardedInstaller = awardedInstallerRef;
      }
      
      // Ensure the property does not exist if it's not set
      if (!jobData.awardedInstaller) {
        delete jobData.awardedInstaller;
      }
       if (!jobData.selectedInstallers) {
        delete jobData.selectedInstallers;
      }
      if (!jobData.rating) {
        delete jobData.rating;
      }


      batch.set(jobRef, jobData);
    });
    console.log(`${mockJobs.length} jobs prepared for batch write.`);

    // Commit the batch
    console.log('Committing batch write to Firestore...');
    await batch.commit();
    console.log('------------------------------------------');
    console.log('✅ Database seeded successfully!');
    console.log('------------------------------------------');
  } catch (error) {
    console.error('❌ Error seeding database:');
    console.error(error);
    process.exit(1);
  }
}

seedDatabase();
