
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { jobs as mockJobs } from '../data';
import { users as mockUsers } from '../data';
import type { Job, User } from '../types';
import * as fs from 'fs';
import * as path from 'path';

async function seedDatabase() {
  try {
    console.log('Initializing Firebase Admin SDK...');
    
    const serviceAccountPath = path.resolve(process.cwd(), 'src/lib/firebase/service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error("service-account.json not found at 'src/lib/firebase/service-account.json'. Please ensure the file exists and contains your Firebase service account credentials.");
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // This is the critical fix: programmatically replace escaped newlines with literal newlines.
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

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
