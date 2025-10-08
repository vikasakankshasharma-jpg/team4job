
import { Job, User, Bid, Comment, Dispute, PrivateMessage } from './types';
import { PlaceHolderImages } from './placeholder-images';

// --- USERS ---
// Note: In a real app, passwords would be hashed and never stored in plain text.
// For this demo, we are not handling passwords in the data file.
// The IDs here are placeholders and will be replaced by Firebase Auth UIDs in a real setup.
export const users: User[] = [
  {
    id: 'admin-user-id',
    name: 'Vikas Akanksha Sharma',
    email: 'vikas.sharma@example.com',
    mobile: '9999999999',
    roles: ['Admin'],
    memberSince: new Date('2024-01-01'),
    avatarUrl: PlaceHolderImages[0].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/admin/200/200',
    address: { house: '1', street: 'Admin Lane', cityPincode: '110001, Connaught Place', fullAddress: '1 Admin Lane, Connaught Place, New Delhi, 110001' },
    pincodes: { residential: '110001' }
  },
  {
    id: 'jobgiver-user-id',
    name: 'Priya Singh',
    email: 'priya.singh@example.com',
    mobile: '9876543210',
    roles: ['Job Giver'],
    memberSince: new Date('2024-02-10'),
    avatarUrl: PlaceHolderImages[1].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/priya/200/200',
    address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashok Nagar', fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001' },
    pincodes: { residential: '560001' }
  },
  {
    id: 'installer-user-id-1',
    name: 'Vikram Kumar',
    email: 'vikram.kumar@example.com',
    mobile: '8765432109',
    roles: ['Installer'],
    memberSince: new Date('2024-03-15'),
    avatarUrl: PlaceHolderImages[2].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/vikram/200/200',
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
    id: 'both-user-id',
    name: 'Rohan Mehta',
    email: 'rohan.mehta@example.com',
    mobile: '7654321098',
    roles: ['Job Giver', 'Installer'],
    memberSince: new Date('2024-04-01'),
    avatarUrl: PlaceHolderImages[3].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/rohan/200/200',
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
    id: 'installer-user-id-2',
    name: 'Anjali Desai',
    email: 'anjali.desai@example.com',
    mobile: '9012345678',
    roles: ['Installer'],
    memberSince: new Date('2024-05-20'),
    avatarUrl: PlaceHolderImages[4].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/anjaliD/200/200',
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
    {
    id: 'installer-user-id-3',
    name: 'Suresh Gupta',
    email: 'suresh.gupta@example.com',
    mobile: '9876543215',
    roles: ['Installer'],
    memberSince: new Date('2024-06-01'),
    avatarUrl: PlaceHolderImages[5].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/suresh/200/200',
    address: { house: 'E-50', street: 'Nirman Nagar', cityPincode: '302019, Jaipur', fullAddress: 'E-50, Nirman Nagar, Jaipur' },
    pincodes: { residential: '302019' },
    installerProfile: {
      tier: 'Bronze',
      points: 80,
      skills: ['cabling', 'analog cameras'],
      rating: 4.0,
      reviews: 2,
      verified: false,
      reputationHistory: [
        { month: 'Jan', points: 0 }, { month: 'Feb', points: 0 }, { month: 'Mar', points: 0 },
        { month: 'Apr', points: 0 }, { month: 'May', points: 30 }, { month: 'Jun', points: 80 },
      ]
    }
  }
];

export let jobs: Job[] = [
    // This data is now generated in the seed script
];
export let bids: Bid[] = [
    // This data is now generated in the seed script
];
export let comments: Comment[] = [
    // This data is now generated in the seed script
];
export let disputes: Dispute[] = [
    // This data is now generated in the seed script
];
export let privateMessages: PrivateMessage[] = [
    // This data is now generated in the seed script
];

export const allSkills = ["ip camera", "nvr setup", "cabling", "troubleshooting", "ptz", "vms", "access control", "analog cameras", "wireless cameras", "fiber optics", "thermal cameras"];

    