
import { Job, User, Bid, Comment, Dispute, PrivateMessage } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const users: Omit<User, 'id'>[] = [
  {
    name: 'Vikas Akanksha Sharma',
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
    name: 'Priya Singh',
    email: 'jobgiver@example.com',
    mobile: '9876543210',
    roles: ['Job Giver'],
    memberSince: new Date('2024-02-10'),
    avatarUrl: PlaceHolderImages[1].imageUrl,
    realAvatarUrl: 'https://picsum.photos/seed/priya/200/200',
    address: { house: 'B-12', street: 'MG Road', cityPincode: '560001, Ashok Nagar', fullAddress: 'B-12, MG Road, Ashok Nagar, Bengaluru, 560001' },
    pincodes: { residential: '560001' }
  },
  {
    name: 'Vikram Kumar',
    email: 'installer@example.com',
    mobile: '8765432109',
    roles: ['Installer', 'Job Giver'],
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
  }
];

export let jobs: Job[] = [];
export let bids: Bid[] = [];
export let comments: Comment[] = [];
export let disputes: Dispute[] = [];
export let privateMessages: PrivateMessage[] = [];

export const allSkills = ["ip camera", "nvr setup", "cabling", "troubleshooting", "ptz", "vms", "access control", "analog cameras", "wireless cameras", "fiber optics", "thermal cameras"];
