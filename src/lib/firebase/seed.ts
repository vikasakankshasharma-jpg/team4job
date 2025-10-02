
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { jobs as mockJobs } from '../data';
import { users as mockUsers } from '../data';
import type { Job, User, Comment, Bid } from '../types';

config();

async function seedDatabase() {
  try {
    console.log('Initializing Firebase Admin SDK...');
    
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please provide it in your .env file.");
    }

    const parsedServiceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));

    initializeApp({
      credential: cert(parsedServiceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
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
      batch.set(userRef, userData);
    });
    console.log(`${mockUsers.length} users prepared for batch write.`);

    // 2. Seed Jobs
    console.log('Preparing to seed jobs...');
    mockJobs.forEach((job: Omit<Job, 'postedAt' | 'deadline' | 'jobStartDate' | 'bids' | 'comments' | 'jobGiver' | 'awardedInstaller'> & { postedAt: any; deadline: any; jobStartDate: any; bids: any[]; comments: any[]; jobGiver: any; awardedInstaller?: any }) => {
      const jobRef = db.collection('jobs').doc(job.id);

      const jobGiverRef = db.collection('users').doc(job.jobGiver.id);
      const awardedInstallerRef = job.awardedInstaller ? db.collection('users').doc(typeof job.awardedInstaller === 'string' ? job.awardedInstaller : job.awardedInstaller.id) : null;

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
      } else {
        // Ensure the property does not exist if there is no awarded installer
        delete jobData.awardedInstaller;
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
