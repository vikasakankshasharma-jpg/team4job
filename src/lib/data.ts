import { Job, User, Bid, Comment, Dispute, PrivateMessage } from './types';
import { PlaceHolderImages } from './placeholder-images';

// This file is now a placeholder. The application fetches data directly from Firestore.
// The demo data is managed exclusively by the database seeding script
// located in `src/lib/firebase/seed.ts`.

export let users: User[] = [
  {
    id: 'ADMIN-20240101-0001',
    name: 'Vikas Sharma',
    email: 'admin@example.com',
    mobile: '9999999999',
    roles: ['Admin'],
    memberSince: new Date('2024-01-01'),
    avatarUrl: PlaceHolderImages[0].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/admin/200/200',
    address: { house: '1', street: 'Admin Lane', cityPincode: '110001, Connaught Place S.O', fullAddress: '1 Admin Lane, Connaught Place, New Delhi, 110001' },
    pincodes: { residential: '110001' }
  },
  {
    id: 'JOBGIVER-20240210-0002',
    name: 'Priya Singh',
    email: 'jobgiver@example.com',
    mobile: '9876543210',
    roles: ['Job Giver'],
    memberSince: new Date('2024-02-10'),
    avatarUrl: PlaceHolderImages[1].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/priya/200/200',
    address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O', fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001' },
    pincodes: { residential: '560001' }
  },
    {
    id: 'INSTALLER-20240315-0003',
    name: 'Vikram Kumar',
    email: 'installer@example.com',
    mobile: '8765432109',
    roles: ['Installer', 'Job Giver'],
    memberSince: new Date('2024-03-15'),
    avatarUrl: PlaceHolderImages[2].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/vikram/200/200',
    address: { house: '42/C', street: 'Link Road', cityPincode: '400053, Andheri West S.O', fullAddress: '42/C, Link Road, Andheri West, Mumbai, 400053' },
    pincodes: { residential: '400053', office: '400063' },
    installerProfile: {
      tier: 'Gold',
      points: 1250,
      skills: ['ip camera', 'nvr setup', 'cabling', 'troubleshooting', 'ptz', 'vms'],
      rating: 4.8,
      reviews: 25,
      verified: true,
      reputationHistory: [
        { month: 'Jan', points: 100 }, { month: 'Feb', points: 350 }, { month: 'Mar', points: 600 },
        { month: 'Apr', points: 800 }, { month: 'May', points: 1050 }, { month: 'Jun', points: 1250 },
      ]
    },
  },
  {
    id: 'INSTALLER-20240401-0004',
    name: 'Ravi Kumar',
    email: 'just-installer@example.com',
    mobile: '7654321098',
    roles: ['Installer'],
    memberSince: new Date('2024-04-01'),
    avatarUrl: PlaceHolderImages[3].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/ravi/200/200',
    address: { house: 'Plot 88', street: 'Sector 18', cityPincode: '122022, Gurgaon S.O', fullAddress: 'Plot 88, Sector 18, Gurgaon, Haryana, 122022' },
    pincodes: { residential: '122022' },
    installerProfile: {
      tier: 'Bronze',
      points: 150,
      skills: ['ip camera', 'cabling', 'troubleshooting'],
      rating: 4.5,
      reviews: 5,
      verified: true,
      reputationHistory: [
        { month: 'Apr', points: 50 }, { month: 'May', points: 100 }, { month: 'Jun', points: 150 },
      ]
    },
  },
];

export let bids: Bid[] = [];
export let comments: Comment[] = [];
export let disputes: Dispute[] = [];
export let privateMessages: PrivateMessage[] = [];

export let jobs: Job[] = [
    {
        id: "JOB-20240720-A1B2",
        title: "Install 16 Dahua IP Cameras for a Commercial Building",
        description: "We require the installation of 16 Dahua 5MP IP cameras across our 4-story commercial building in Ashok Nagar, Bengaluru. The job includes camera mounting, cabling (Cat6), and NVR configuration. All hardware will be provided.",
        jobGiver: users[1],
        location: "560001",
        fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001',
        address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashoknagar S.O' },
        budget: { min: 20000, max: 25000 },
        status: "Open for Bidding",
        deadline: new Date(new Date().setDate(new Date().getDate() + 5)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 4)),
        jobStartDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        bids: [
            {
                id: "bid-job1-user3",
                installer: users[2],
                amount: 22500,
                timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
                coverLetter: "I'm a Gold-tier installer with 5 years of experience in large commercial projects. I can start next week and ensure a clean, professional installation."
            }
        ], 
        bidderIds: [users[2].id],
        comments: [
            {
                id: "comment-job1-user3",
                author: users[2],
                timestamp: new Date(new Date().setDate(new Date().getDate() - 2)),
                content: "Is there an existing cabling infrastructure, or will new conduits need to be run?"
            },
            {
                id: "comment-job1-user1",
                author: users[1],
                timestamp: new Date(new Date().setDate(new Date().getDate() - 1)),
                content: "Good question. There are existing conduits, but some may need to be replaced. Please factor a small amount of new conduit work into your bid."
            }
        ],
        privateMessages: [],
        completionOtp: Math.floor(100000 + Math.random() * 900000).toString(),
    },
    {
        id: "JOB-20240615-C3D4",
        title: "Factory Security System Overhaul - 32 Cameras",
        description: "Complete overhaul of an existing security system at a factory in Peenya. Requires replacing 32 old analog cameras with new Hikvision IP cameras, setting up a new server room with 2 NVRs, and integrating with our existing network.",
        jobGiver: users[1],
        location: "560058",
        fullAddress: 'Peenya Industrial Area, Bengaluru, 560058',
        address: { house: 'Plot 42', street: 'Peenya Industrial Area', cityPincode: '560058, Peenya S.O' },
        budget: { min: 45000, max: 60000 },
        status: "Completed",
        deadline: new Date('2024-06-10'),
        postedAt: new Date('2024-06-01'),
        jobStartDate: new Date('2024-06-15'),
        awardedInstaller: users[2],
        bids: [
            {
                id: "bid-job2-user3",
                installer: users[2],
                amount: 52000,
                timestamp: new Date('2024-06-03'),
                coverLetter: "I have extensive experience with large-scale factory installations and can complete this overhaul efficiently. My team is certified in Hikvision products."
            }
        ],
        bidderIds: [users[2].id],
        comments: [],
        privateMessages: [],
        rating: 5,
        completionOtp: "543210",
    },
    {
        id: "JOB-20240718-E5F6",
        title: "Residential Villa - 4 PTZ Cameras",
        description: "Installation of 4 outdoor PTZ cameras for a 2-story villa. Requires weather-proof cabling and connection to a cloud-based storage service.",
        jobGiver: users[1],
        location: "400049",
        fullAddress: 'Villa 17, Juhu Tara Road, Juhu, Mumbai, 400049',
        address: { house: 'Villa 17', street: 'Juhu Tara Road', cityPincode: '400049, Juhu S.O' },
        budget: { min: 8000, max: 12000 },
        status: "In Progress",
        deadline: new Date(new Date().setDate(new Date().getDate() - 2)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 7)),
        jobStartDate: new Date(),
        awardedInstaller: users[3],
        bids: [
            {
                id: "bid-job3-user4",
                installer: users[3],
                amount: 8500,
                timestamp: new Date(new Date().setDate(new Date().getDate() - 3)),
                coverLetter: "I can handle this residential installation quickly and cleanly. I have the required tools and experience."
            }
        ],
        bidderIds: [users[3].id],
        comments: [],
        privateMessages: [],
        completionOtp: "987123",
    },
    {
        id: "JOB-20240722-G7H8",
        title: "Unbid Job: Small Shop Camera Setup",
        description: "Looking for an installer to set up 2 dome cameras in a small retail shop. Simple setup, hardware provided.",
        jobGiver: users[1],
        location: "110001",
        fullAddress: 'Shop 5, Khan Market, New Delhi, 110001',
        address: { house: 'Shop 5', street: 'Khan Market', cityPincode: '110001, Connaught Place S.O' },
        budget: { min: 2000, max: 4000 },
        status: "Unbid",
        deadline: new Date(new Date().setDate(new Date().getDate() - 1)), // Deadline passed
        postedAt: new Date(new Date().setDate(new Date().getDate() - 5)),
        jobStartDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        bids: [],
        bidderIds: [],
        comments: [],
        privateMessages: [],
        completionOtp: "112233",
    }
];

export const allSkills = ["ip camera", "nvr setup", "cabling", "troubleshooting", "ptz", "vms", "access control", "analog cameras", "wireless cameras", "fiber optics", "thermal cameras", "ai analytics"];
