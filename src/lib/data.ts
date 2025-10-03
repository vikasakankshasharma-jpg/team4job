
import { Job, User, Bid, Comment, Dispute, PrivateMessage } from './types';
import { PlaceHolderImages } from './placeholder-images';

// Helper function to generate a unique user ID
const generateUserId = (role: 'JOBGIVER' | 'INSTALLER' | 'ADMIN' | 'USER', index: number) => {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `${role}-${datePart}-${String(index).padStart(4, '0')}`;
};

// Helper function to generate a unique job ID
const generateJobId = (index: number) => {
    const date = new Date();
    const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `JOB-${datePart}-${String(index).padStart(2, '0')}${randomPart}`;
};

export const allSkills = ["ip camera", "nvr setup", "cabling", "troubleshooting", "ptz", "vms", "access control", "analog cameras", "wireless cameras", "fiber optics", "thermal cameras"];

// --- USERS ---
export const users: User[] = [
  {
    id: 'ADMIN-20240101-0001',
    name: 'Admin User',
    email: 'admin@example.com',
    mobile: '9999999999',
    roles: ['Admin'],
    memberSince: new Date('2024-01-01'),
    avatarUrl: PlaceHolderImages[0].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/admin/200/200',
    address: { house: '1', street: 'Admin Lane', cityPincode: '110001, Connaught Place', fullAddress: '1 Admin Lane, Connaught Place, New Delhi, 110001' },
    pincodes: { residential: '110001' }
  },
  {
    id: 'JOBGIVER-20240210-0002',
    name: 'Anjali Sharma',
    email: 'jobgiver@example.com',
    mobile: '9876543210',
    roles: ['Job Giver'],
    memberSince: new Date('2024-02-10'),
    avatarUrl: PlaceHolderImages[1].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/anjali/200/200',
    address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashok Nagar', fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001' },
    pincodes: { residential: '560001' }
  },
  {
    id: 'INSTALLER-20240315-0003',
    name: 'Rajesh Kumar',
    email: 'installer@example.com',
    mobile: '8765432109',
    roles: ['Installer'],
    memberSince: new Date('2024-03-15'),
    avatarUrl: PlaceHolderImages[2].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/rajesh/200/200',
    address: { house: '42/C', street: 'Link Road', cityPincode: '400053, Andheri West', fullAddress: '42/C, Link Road, Andheri West, Mumbai, 400053' },
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
    id: 'USER-20240401-0004',
    name: 'Priya Singh',
    email: 'priya.singh@example.com',
    mobile: '7654321098',
    roles: ['Job Giver', 'Installer'],
    memberSince: new Date('2024-04-01'),
    avatarUrl: PlaceHolderImages[3].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/priya/200/200',
    address: { house: '101, Cyber Towers', street: 'Hitech City', cityPincode: '500081, Madhapur', fullAddress: '101, Cyber Towers, Hitech City, Madhapur, Hyderabad, 500081' },
    pincodes: { residential: '500081' },
    installerProfile: {
      tier: 'Silver',
      points: 650,
      skills: ['analog cameras', 'cabling', 'wireless cameras'],
      rating: 4.5,
      reviews: 12,
      verified: true,
      reputationHistory: [
        { month: 'Jan', points: 50 }, { month: 'Feb', points: 150 }, { month: 'Mar', points: 300 },
        { month: 'Apr', points: 450 }, { month: 'May', points: 550 }, { month: 'Jun', points: 650 },
      ]
    }
  },
  {
    id: 'INSTALLER-20240520-0005',
    name: 'Sandeep Verma',
    email: 'sandeep.v@example.com',
    mobile: '9012345678',
    roles: ['Installer'],
    memberSince: new Date('2024-05-20'),
    avatarUrl: PlaceHolderImages[4].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/sandeep/200/200',
    address: { house: 'Flat 5A', street: 'Sector 18', cityPincode: '201301, Noida', fullAddress: 'Flat 5A, Sector 18, Noida, 201301' },
    pincodes: { residential: '201301' },
    installerProfile: {
      tier: 'Bronze',
      points: 250,
      skills: ['ip camera', 'troubleshooting'],
      rating: 4.2,
      reviews: 5,
      verified: true,
      reputationHistory: [
        { month: 'Jan', points: 0 }, { month: 'Feb', points: 0 }, { month: 'Mar', points: 50 },
        { month: 'Apr', points: 120 }, { month: 'May', points: 180 }, { month: 'Jun', points: 250 },
      ]
    }
  },
];

// --- BIDS ---
export const bids: Bid[] = [
  { id: 'bid-1-1', installer: users[2], amount: 22000, timestamp: new Date(new Date().setDate(new Date().getDate() - 2)), coverLetter: "I have extensive experience with Dahua systems and can complete this installation efficiently." },
  { id: 'bid-1-2', installer: users[3], amount: 24000, timestamp: new Date(new Date().setDate(new Date().getDate() - 1)), coverLetter: "As a Silver tier installer, I guarantee a high-quality setup and can start immediately." },
  { id: 'bid-2-1', installer: users[4], amount: 48000, timestamp: new Date(new Date().setDate(new Date().getDate() - 3)) },
  { id: 'bid-4-1', installer: users[2], amount: 7000, timestamp: new Date(new Date().setDate(new Date().getDate() - 1)), coverLetter: "I'm the best for this." },
];

// --- COMMENTS ---
export const comments: Comment[] = [
    { id: 'comment-1-1', author: users[3], content: "Is the site ready for wiring or will that need to be done as well?", timestamp: new Date(new Date().setDate(new Date().getDate() - 3)) },
    { id: 'comment-1-2', author: users[1], content: "Site is ready, all conduit is in place.", timestamp: new Date(new Date().setDate(new Date().getDate() - 2)) },
];

// --- PRIVATE MESSAGES ---
export const privateMessages: PrivateMessage[] = [
    { id: 'pm-3-1', author: users[1], content: "Welcome aboard! When can you start?", timestamp: new Date(new Date().setDate(new Date().getDate() - 1)) },
    { id: 'pm-3-2', author: users[2], content: "Thank you! I can start tomorrow morning at 9 AM.", timestamp: new Date() },
];


// --- JOBS ---
export let jobs: Job[] = [
    {
        id: generateJobId(1),
        title: "Install 16 Dahua IP Cameras for a Commercial Building",
        description: "We require the installation of 16 Dahua 5MP IP cameras across our 4-story commercial building in Ashok Nagar, Bengaluru. The job includes camera mounting, cabling (Cat6), and NVR configuration. All hardware will be provided.",
        jobGiver: users[1],
        location: "560001",
        fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001',
        budget: { min: 20000, max: 25000 },
        status: "Open for Bidding",
        deadline: new Date(new Date().setDate(new Date().getDate() + 5)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 4)),
        jobStartDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        bids: [bids[0], bids[1]],
        bidderIds: [users[2].id, users[3].id],
        comments: [comments[0], comments[1]],
        attachments: [{ fileName: 'floor-plan.pdf', fileUrl: '#', fileType: 'application/pdf' }]
    },
    {
        id: generateJobId(2),
        title: "Factory Security System Overhaul - 32 Cameras",
        description: "Complete overhaul of an existing security system at a factory in Peenya. Requires replacing 32 old analog cameras with new Hikvision IP cameras, setting up a new server room with 2 NVRs, and integrating with our existing network.",
        jobGiver: users[1],
        location: "560058",
        fullAddress: 'Peenya Industrial Area, Bengaluru, 560058',
        budget: { min: 45000, max: 60000 },
        status: "Bidding Closed",
        deadline: new Date(new Date().setDate(new Date().getDate() - 1)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 8)),
        jobStartDate: new Date(new Date().setDate(new Date().getDate() + 5)),
        bids: [bids[2]],
        bidderIds: [users[4].id],
        comments: [],
    },
    {
        id: generateJobId(3),
        title: "Home Security Setup - 4 Wireless Cameras",
        description: "Need a simple home security setup with 4 TP-Link Tapo wireless cameras. Installation should include camera placement, connection to home WiFi, and setup of the mobile app.",
        jobGiver: users[3],
        location: "500081",
        fullAddress: '101, Cyber Towers, Hitech City, Madhapur, Hyderabad, 500081',
        budget: { min: 4000, max: 6000 },
        status: "In Progress",
        deadline: new Date(new Date().setDate(new Date().getDate() - 10)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 15)),
        jobStartDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        awardedInstaller: users[2],
        bids: [bids[0]],
        bidderIds: [users[2].id],
        comments: [],
        privateMessages: [privateMessages[0], privateMessages[1]],
        completionOtp: "123456"
    },
     {
        id: generateJobId(4),
        title: "Retail Store PTZ Camera Installation",
        description: "Installation of a single high-speed PTZ camera in our retail store in Andheri. The camera needs to cover the entire shop floor and be controllable from the manager's office. Experience with PTZ configuration is a must.",
        jobGiver: users[1],
        location: "400053",
        fullAddress: '42/C, Link Road, Andheri West, Mumbai, 400053',
        budget: { min: 5000, max: 8000 },
        status: "Completed",
        deadline: new Date(new Date().setDate(new Date().getDate() - 30)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 40)),
        awardedInstaller: users[2],
        bids: [bids[3]],
        bidderIds: [users[2].id],
        comments: [],
        rating: 5,
        completionOtp: "789012"
    },
     {
        id: generateJobId(5),
        title: "Apartment Complex Access Control System",
        description: "We are looking for an installer to set up a new access control system for our apartment complex with 2 buildings. This involves installing card readers at 4 entry points and integrating with an electric lock system.",
        jobGiver: users[3],
        location: "500081",
        fullAddress: 'My Home Bhooja, Hitech City, Madhapur, Hyderabad, 500081',
        budget: { min: 30000, max: 40000 },
        status: "Cancelled",
        deadline: new Date(new Date().setDate(new Date().getDate() - 20)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 25)),
        bids: [],
        comments: [],
    },
    {
        id: generateJobId(6),
        title: "NVR Troubleshooting for Small Office",
        description: "Our office NVR has stopped recording. We need an expert to diagnose and fix the issue. The NVR is a Hikvision 16-channel model. Please quote for a site visit and initial diagnosis.",
        jobGiver: users[1],
        location: "560001",
        fullAddress: 'Residency Road, Ashok Nagar, Bengaluru, 560001',
        budget: { min: 1000, max: 2500 },
        status: "Open for Bidding",
        deadline: new Date(new Date().setDate(new Date().getDate() + 2)),
        postedAt: new Date(new Date().setDate(new Date().getDate() - 1)),
        bids: [],
        comments: []
    },
    {
        id: generateJobId(7),
        title: "Urgent: Fix 2 Offline Cameras in Warehouse",
        description: "Two of our warehouse cameras are offline. We suspect a cabling issue. Need someone to come onsite, identify the fault, and repair it. Location is near Noida Sector 62.",
        jobGiver: users[1],
        location: "201309",
        fullAddress: 'Noida Sector 62, Noida, 201309',
        budget: { min: 2000, max: 4000 },
        status: "Awarded",
        deadline: new Date(new Date().setDate(new Date().getDate() - 2)),
        acceptanceDeadline: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
        postedAt: new Date(new Date().setDate(new Date().getDate() - 5)),
        awardedInstaller: users[4],
        bids: [
            { id: 'bid-7-1', installer: users[4], amount: 3500, timestamp: new Date(new Date().setDate(new Date().getDate() - 3)) },
            { id: 'bid-7-2', installer: users[2], amount: 3800, timestamp: new Date(new Date().setDate(new Date().getDate() - 4)) }
        ],
        bidderIds: [users[4].id, users[2].id],
        comments: [],
        completionOtp: "334455"
    },
    {
        id: generateJobId(8),
        title: "New Villa Full Coverage (Analog HD)",
        description: "Looking for an installer to provide full security coverage for a new villa in Jubilee Hills. Plan for 8-10 Analog HD cameras. Need consultation on camera placement as well.",
        jobGiver: users[3],
        location: "500033",
        fullAddress: 'Jubilee Hills, Hyderabad, 500033',
        budget: { min: 15000, max: 22000 },
        status: "Open for Bidding",
        deadline: new Date(new Date().setDate(new Date().getDate() + 10)),
        postedAt: new Date(),
        bids: [],
        comments: []
    },
];

export const disputes: Dispute[] = [
    {
        id: "DISPUTE-001",
        requesterId: users[1].id,
        category: "Job Dispute",
        title: "Work Not Completed as per Agreement",
        jobId: jobs[3].id,
        jobTitle: jobs[3].title,
        status: 'Under Review',
        reason: "The installer marked the job as complete, but two of the four cameras are not configured correctly and are not accessible on the mobile app. The installer is unresponsive.",
        parties: {
            jobGiverId: users[1].id,
            installerId: users[2].id,
        },
        messages: [
            { authorId: users[1].id, authorRole: 'Job Giver', content: "The job is not done. Two cameras are offline.", timestamp: new Date(new Date().setDate(new Date().getDate() - 2)) },
            { authorId: users[2].id, authorRole: 'Installer', content: "The cameras were working when I left. It might be a network issue on your end.", timestamp: new Date(new Date().setDate(new Date().getDate() - 1)) },
            { authorId: 'ADMIN-20240101-0001', authorRole: 'Admin', content: "We are reviewing the case. @Rajesh Kumar, can you provide proof of completion?", timestamp: new Date() },
        ],
        createdAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    },
    {
        id: "DISPUTE-002",
        requesterId: users[4].id,
        category: "Billing Inquiry",
        title: "Question about Platform Commission",
        jobId: undefined,
        status: 'Open',
        reason: "I completed a job and the final payout was less than I expected. Can you please explain the commission structure?",
        messages: [
             { authorId: users[4].id, authorRole: 'Installer', content: "I completed a job and the final payout was less than I expected. Can you please explain the commission structure?", timestamp: new Date() },
        ],
        createdAt: new Date(),
    },
     {
        id: "DISPUTE-003",
        requesterId: users[3].id,
        category: "Technical Support",
        title: "Cannot post a new job",
        jobId: undefined,
        status: 'Resolved',
        reason: "The 'Post Job' button is not working for me. I click it and nothing happens. Please help.",
        messages: [
            { authorId: users[3].id, authorRole: 'Job Giver', content: "The 'Post Job' button is not working for me. I click it and nothing happens. Please help.", timestamp: new Date(new Date().setDate(new Date().getDate() - 5)) },
            { authorId: 'ADMIN-20240101-0001', authorRole: 'Admin', content: "We had a temporary issue that is now resolved. Please try clearing your browser cache and try again.", timestamp: new Date(new Date().setDate(new Date().getDate() - 4)) },
        ],
        createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
        resolvedAt: new Date(new Date().setDate(new Date().getDate() - 4)),
    },
];
