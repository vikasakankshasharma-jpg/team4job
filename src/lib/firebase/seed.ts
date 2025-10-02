
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { jobs as mockJobs, users as mockUsers } from '../data';
import type { Job, User } from '../types';

// Load environment variables from .env file
config();

async function seedDatabase() {
  try {
    console.log('Initializing Firebase Admin SDK...');
    
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountString) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY not found in .env file. Please ensure the variable is set and contains your entire Firebase service account JSON.");
    }
    
    const serviceAccount = JSON.parse(serviceAccountString);

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    
    const db = getFirestore();
    console.log('Firebase Admin SDK initialized successfully.');

    const batch = db.batch();

    console.log('Preparing to seed users...');
    mockUsers.forEach((user: Omit<User, 'memberSince'> & { memberSince: Date | string }) => {
      const userRef = db.collection('users').doc(user.id);
      const userData = {
        ...user,
        memberSince: Timestamp.fromDate(new Date(user.memberSince)),
      };
      if (userData.installerProfile?.aadharData) {
        delete userData.installerProfile.aadharData;
      }
      batch.set(userRef, userData);
    });
    console.log(`${mockUsers.length} users prepared for batch write.`);

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
