
import type { User, Job, Bid, Comment } from './types';
import { PlaceHolderImages } from './placeholder-images';

// Updated to use centralized placeholder images for anonymity
const userAvatars: Record<string, string> = {
  'ADMIN-20240101-VIKAS': PlaceHolderImages.find(p => p.id === 'avatar1')?.imageUrl || '',
  'USER-20220815-ALEXJ': PlaceHolderImages.find(p => p.id === 'avatar1')?.imageUrl || '',
  'JOBGIVER-20230120-BREN': PlaceHolderImages.find(p => p.id === 'avatar2')?.imageUrl || '',
  'INSTALLER-20230510-CARL': PlaceHolderImages.find(p => p.id === 'avatar3')?.imageUrl || '',
  'INSTALLER-20240301-DIAN': PlaceHolderImages.find(p => p.id === 'avatar4')?.imageUrl || '',
  'INSTALLER-20211111-ETHA': PlaceHolderImages.find(p => p.id === 'avatar5')?.imageUrl || '',
  'JOBGIVER-20220430-FION': PlaceHolderImages.find(p => p.id === 'avatar6')?.imageUrl || '',
  'INSTALLER-20230801-GEOR': PlaceHolderImages.find(p => p.id === 'avatar7')?.imageUrl || '',
  'USER-20240110-HANN': PlaceHolderImages.find(p => p.id === 'avatar8')?.imageUrl || '',
};


export const users: User[] = [
  {
    id: 'ADMIN-20240101-VIKAS',
    name: 'Vikas Sharma',
    anonymousId: 'Admin-0001',
    email: 'vikaskumarsharma@gmail.com',
    mobile: '9772699395',
    avatarUrl: userAvatars['ADMIN-20240101-VIKAS'],
    realAvatarUrl: 'https://picsum.photos/seed/vikas/100/100',
    pincodes: { residential: '110001' },
    roles: ['Admin'],
    memberSince: new Date('2024-01-01'),
  },
  {
    id: 'USER-20220815-ALEXJ',
    name: 'Alex Johnson',
    anonymousId: 'Installer-8421',
    email: 'alex.j@example.com',
    mobile: '9876543210',
    avatarUrl: userAvatars['USER-20220815-ALEXJ'],
    realAvatarUrl: 'https://picsum.photos/seed/alex/100/100',
    pincodes: { residential: '110001, Parliament Street', office: '110021, Sarojini Nagar' },
    roles: ['Job Giver', 'Installer'],
    memberSince: new Date('2022-08-15'),
    installerProfile: {
      tier: 'Gold',
      points: 1250,
      skills: ['IP Cameras', 'NVR Setup', 'Remote Viewing', 'Access Control', 'Structured Cabling'],
      rating: 4.9,
      reviews: 28,
      verified: true,
      reputationHistory: [
        { month: 'Apr', points: 200 },
        { month: 'May', points: 150 },
        { month: 'Jun', points: 300 },
        { month: 'Jul', points: 250 },
        { month: 'Aug', points: 150 },
        { month: 'Sep', points: 200 },
      ],
      aadharData: {
        name: 'Alex Johnson',
        mobile: '9876543210',
        pincode: '110001',
      }
    },
  },
  {
    id: 'JOBGIVER-20230120-BREN',
    name: 'Brenda Smith',
    anonymousId: 'JobGiver-3109',
    email: 'brenda.s@example.com',
    mobile: '9876543211',
    avatarUrl: userAvatars['JOBGIVER-20230120-BREN'],
    realAvatarUrl: 'https://picsum.photos/seed/brenda/100/100',
    pincodes: { residential: '400001, Kalbadevi' },
    roles: ['Job Giver'],
    memberSince: new Date('2023-01-20'),
  },
  {
    id: 'INSTALLER-20230510-CARL',
    name: 'Carlos Diaz',
    anonymousId: 'Installer-5582',
    email: 'carlos.d@example.com',
    mobile: '9876543212',
    avatarUrl: userAvatars['INSTALLER-20230510-CARL'],
    realAvatarUrl: 'https://picsum.photos/seed/carlos/100/100',
    pincodes: { residential: '500001, Hyderabad G.P.O.' },
    roles: ['Installer'],
    memberSince: new Date('2023-05-10'),
    installerProfile: {
      tier: 'Silver',
      points: 600,
      skills: ['Analog Cameras', 'DVR Configuration', 'Cabling', 'Troubleshooting'],
      rating: 4.7,
      reviews: 12,
      verified: true,
      reputationHistory: [
        { month: 'Apr', points: 100 },
        { month: 'May', points: 50 },
        { month: 'Jun', points: 150 },
        { month: 'Jul', points: 100 },
        { month: 'Aug', points: 100 },
        { month: 'Sep', points: 100 },
      ],
      aadharData: {
          name: 'Carlos Diaz',
          mobile: '9876543212',
          pincode: '500001'
      }
    },
  },
  {
    id: 'INSTALLER-20240301-DIAN',
    name: 'Diana Prince',
    anonymousId: 'Installer-7734',
    email: 'diana.p@example.com',
    mobile: '9876543213',
    avatarUrl: userAvatars['INSTALLER-20240301-DIAN'],
    realAvatarUrl: 'https://picsum.photos/seed/diana/100/100',
    pincodes: { residential: '600001, Chennai G.P.O.' },
    roles: ['Installer'],
    memberSince: new Date('2024-03-01'),
    installerProfile: {
      tier: 'Bronze',
      points: 250,
      skills: ['IP Cameras', 'Basic Setup', 'Wireless Cameras'],
      rating: 4.5,
      reviews: 4,
      verified: false,
      reputationHistory: [
        { month: 'Apr', points: 0 },
        { month: 'May', points: 50 },
        { month: 'Jun', points: 50 },
        { month: 'Jul', points: 75 },
        { month: 'Aug', points: 25 },
        { month: 'Sep', points: 50 },
      ]
    },
  },
  {
    id: 'INSTALLER-20211111-ETHA',
    name: 'Ethan Hunt',
    anonymousId: 'Installer-1007',
    email: 'ethan.h@example.com',
    mobile: '9876543214',
    avatarUrl: userAvatars['INSTALLER-20211111-ETHA'],
    realAvatarUrl: 'https://picsum.photos/seed/ethan/100/100',
    pincodes: { residential: '110031, A.G.C.R.' },
    roles: ['Installer'],
    memberSince: new Date('2021-11-11'),
    installerProfile: {
      tier: 'Platinum',
      points: 2500,
      skills: ['Advanced IP Systems', 'VMS', 'Analytics', 'Access Control', 'Fiber Optics'],
      rating: 5.0,
      reviews: 68,
      verified: true,
      reputationHistory: [
        { month: 'Apr', points: 400 },
        { month: 'May', points: 500 },
        { month: 'Jun', points: 450 },
        { month: 'Jul', points: 350 },
        { month: 'Aug', points: 400 },
        { month: 'Sep', points: 400 },
      ],
      aadharData: {
          name: 'Ethan Hunt',
          mobile: '9876543214',
          pincode: '110031'
      }
    },
  },
  {
    id: 'JOBGIVER-20220430-FION',
    name: 'Fiona Glenanne',
    anonymousId: 'JobGiver-9825',
    email: 'fiona.g@example.com',
    mobile: '9876543215',
    avatarUrl: userAvatars['JOBGIVER-20220430-FION'],
    realAvatarUrl: 'https://picsum.photos/seed/fiona/100/100',
    pincodes: { residential: '400050, Bandra West' },
    roles: ['Job Giver'],
    memberSince: new Date('2022-04-30'),
  },
  {
    id: 'INSTALLER-20230801-GEOR',
    name: 'George Mason',
    anonymousId: 'Installer-4829',
    email: 'george.m@example.com',
    mobile: '9876543216',
    avatarUrl: userAvatars['INSTALLER-20230801-GEOR'],
    realAvatarUrl: 'https://picsum.photos/seed/george/100/100',
    pincodes: { residential: '800001, Bankipore' },
    roles: ['Installer'],
    memberSince: new Date('2023-08-01'),
    installerProfile: {
      tier: 'Gold',
      points: 1100,
      skills: ['Thermal Cameras', 'NVR Setup', 'PTZ Cameras', 'Wireless Bridge'],
      rating: 4.8,
      reviews: 25,
      verified: true,
      reputationHistory: [
         { month: 'Apr', points: 150 },
        { month: 'May', points: 200 },
        { month: 'Jun', points: 250 },
        { month: 'Jul', points: 150 },
        { month: 'Aug', points: 150 },
        { month: 'Sep', points: 200 },
      ],
      aadharData: {
          name: 'George Mason',
          mobile: '9876543216',
          pincode: '800001'
      }
    },
  },
  {
    id: 'USER-20240110-HANN',
    name: 'Hannah Simone',
    anonymousId: 'JobGiver-6033',
    email: 'hannah.s@example.com',
    mobile: '9876543217',
    avatarUrl: userAvatars['USER-20240110-HANN'],
    realAvatarUrl: 'https://picsum.photos/seed/hannah/100/100',
    pincodes: { residential: '500032, S.R.Nagar' },
    roles: ['Job Giver', 'Installer'],
    memberSince: new Date('2024-01-10'),
    installerProfile: {
      tier: 'Silver',
      points: 450,
      skills: ['IP Cameras', 'Home Automation', 'Basic Setup'],
      rating: 4.6,
      reviews: 9,
      verified: false,
      reputationHistory: [
        { month: 'Apr', points: 50 },
        { month: 'May', points: 100 },
        { month: 'Jun', points: 100 },
        { month: 'Jul', points: 50 },
        { month: 'Aug', points: 100 },
        { month: 'Sep', points: 50 },
      ]
    },
  },
];

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);
const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(now.getDate() - 2);
const threeDaysAgo = new Date(now);
threeDaysAgo.setDate(now.getDate() - 3);

const findUser = (id: string) => users.find(u => u.id === id)!;

const comments: {[key: string]: Comment[]} = {
  'JOB-20240920-1A3B': [
    {
      id: 'comment-1-1',
      author: findUser('INSTALLER-20230510-CARL'),
      timestamp: twoDaysAgo,
      content: "What brand of cameras are you planning to use? And is wiring already in place?",
    },
    {
      id: 'comment-1-2',
      author: findUser('JOBGIVER-20230120-BREN'),
      timestamp: yesterday,
      content: "Hi there, we're open to suggestions, but leaning towards Hikvision. No existing wiring, it needs to be run from scratch.",
    },
    {
      id: 'comment-1-3',
      author: findUser('USER-20220815-ALEXJ'),
      timestamp: yesterday,
      content: "Is the building construction concrete or drywall? It will affect the cabling time.",
    },
     {
      id: 'comment-1-4',
      author: findUser('JOBGIVER-20230120-BREN'),
      timestamp: yesterday,
      content: "It's a mix. Mostly drywall interiors with a concrete exterior.",
    }
  ],
  'JOB-20240924-4D5E': [
    {
      id: 'comment-5-1',
      author: findUser('INSTALLER-20240301-DIAN'),
      timestamp: threeDaysAgo,
      content: "Is this a single warehouse or multiple buildings?",
    },
     {
      id: 'comment-5-2',
      author: findUser('JOBGIVER-20220430-FION'),
      timestamp: twoDaysAgo,
      content: "It's a single large warehouse, approximately 50,000 sq ft.",
    }
  ],
   'JOB-20240925-P2Q3': [
    {
      id: 'comment-12-1',
      author: findUser('USER-20220815-ALEXJ'),
      timestamp: yesterday,
      content: "I've reviewed the requirements. This seems straightforward. I can start on Monday.",
    },
  ],
};

const bids: {[key: string]: Bid[]} = {
  'JOB-20240920-1A3B': [
    {
      id: 'bid-1-1',
      installer: findUser('USER-20220815-ALEXJ'),
      amount: 14000,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      coverLetter: "With over 5 years of experience in IP camera systems and NVR setups, I can ensure a professional and clean installation. My bid includes all necessary cabling and configuration for remote viewing.",
    },
    {
      id: 'bid-1-2',
      installer: findUser('INSTALLER-20230510-CARL'),
      amount: 12500,
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      coverLetter: "I am confident I can complete this job to your satisfaction. I have experience with all major brands and can provide a cost-effective solution without compromising on quality.",
    },
    {
      id: 'bid-1-3',
      installer: findUser('INSTALLER-20211111-ETHA'),
      amount: 18000,
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      coverLetter: "As a Platinum tier installer specializing in advanced systems, I can offer a premium installation with optimized camera placement and robust network configuration for flawless performance. My bid reflects a higher quality of service and components.",
    },
  ],
  'JOB-20240922-2B4C': [
     {
      id: 'bid-2-1',
      installer: findUser('INSTALLER-20240301-DIAN'),
      amount: 9000,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      coverLetter: "I can handle this upgrade efficiently. I'll ensure the new IP system is perfectly integrated.",
    },
  ],
  'JOB-20240915-3C5D': [
     {
      id: 'bid-3-1',
      installer: findUser('INSTALLER-20230510-CARL'),
      amount: 7500,
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      coverLetter: "I specialize in residential installations and can complete this quickly and cleanly. I guarantee a user-friendly setup for your mobile devices.",
    },
  ],
  'JOB-20240924-4D5E': [
     {
      id: 'bid-5-1',
      installer: findUser('INSTALLER-20211111-ETHA'),
      amount: 48000,
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      coverLetter: "My team has extensive experience with large-scale warehouse projects. We use high-quality cabling and network gear to ensure reliable coverage across the entire area. We can also set up advanced analytics like line-crossing detection.",
    },
    {
      id: 'bid-5-2',
      installer: findUser('INSTALLER-20230801-GEOR'),
      amount: 45000,
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 3600000), // 3 days ago + 1 hour
      coverLetter: "I have installed systems in 5 warehouses in the last year. My bid is competitive and I can start next week.",
    },
  ],
  'JOB-20240917-5E6F': [
      {
      id: 'bid-6-1',
      installer: findUser('USER-20220815-ALEXJ'),
      amount: 11000,
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      coverLetter: "I'm a Gold-tier installer with experience in retail environments. I can ensure minimal disruption to your business operations during the installation.",
    },
  ],
  'JOB-20240918-8J9K': [
    {
      id: 'bid-9-1',
      installer: findUser('USER-20220815-ALEXJ'),
      amount: 6000,
      timestamp: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      coverLetter: "I can handle this residential setup. My work is clean and I will ensure you are happy with the camera placements.",
    }
  ],
  'JOB-20240801-K2L3': [
     {
      id: 'bid-10-1',
      installer: findUser('USER-20220815-ALEXJ'),
      amount: 22000,
      timestamp: new Date('2024-08-03T10:00:00Z'),
      coverLetter: "Completed this project successfully.",
    },
  ],
   'JOB-20240925-P2Q3': [
    {
      id: 'bid-12-1',
      installer: findUser('USER-20220815-ALEXJ'),
      amount: 28000,
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      coverLetter: "I have experience with multi-building wireless bridges and can ensure a seamless, unified system. My bid includes high-grade outdoor-rated equipment.",
    },
    {
      id: 'bid-12-2',
      installer: findUser('INSTALLER-20230510-CARL'),
      amount: 26500,
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 3600000), // 1 day ago + 1 hour
      coverLetter: "My team can handle this campus-wide installation, including all trenching and cabling required for the fiber link between buildings.",
    },
  ],
  'JOB-20240928-R4S5': [
    {
      id: 'bid-13-1',
      installer: findUser('INSTALLER-20240301-DIAN'),
      amount: 2800,
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      coverLetter: "I can troubleshoot your NVR and camera connectivity issues. I have a feeling it might be a network switch problem. I can diagnose and fix it.",
    },
  ],
  'JOB-20240910-T6U7': [
      {
      id: 'bid-14-1',
      installer: findUser('INSTALLER-20230510-CARL'),
      amount: 19000,
      timestamp: new Date('2024-09-11T10:00:00Z'),
      coverLetter: "My team and I can handle this.",
    },
  ]
};

export const jobs: Job[] = [
  {
    id: 'JOB-20240920-1A3B',
    title: 'Install 8 IP Cameras for a 2-Story Office Building',
    description: "We are looking for a professional installer to set up a comprehensive surveillance system for our new office. The job involves installing 8 high-definition IP cameras covering both indoor and outdoor areas. The installer will also be responsible for setting up the Network Video Recorder (NVR), configuring motion detection, and enabling remote viewing access on mobile devices. All equipment will be provided, but the installer must supply their own tools and manage all cabling and mounting.",
    jobGiver: findUser('JOBGIVER-20230120-BREN'),
    location: '400001, Kalbadevi',
    fullAddress: '2nd Floor, Oberoi Complex, Kalbadevi, Mumbai, Maharashtra 400001',
    budget: { min: 10000, max: 20000 },
    status: 'Open for Bidding',
    deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    jobStartDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
    postedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    bids: bids['JOB-20240920-1A3B'],
    comments: comments['JOB-20240920-1A3B'] || [],
    completionOtp: '349871',
  },
  {
    id: 'JOB-20240922-2B4C',
    title: 'CCTV System Upgrade for a Retail Store',
    description: "Upgrading an existing 4-camera analog system to a modern 6-camera IP system. The job requires removing the old DVR and cameras, and installing new IP cameras with a new NVR. The installer should be able to advise on optimal camera placement for maximum coverage of the sales floor and entrance/exit points. Experience with POS integration is a plus.",
    jobGiver: findUser('USER-20220815-ALEXJ'),
    location: '110001, Connaught Place',
    fullAddress: 'Shop No. 12, Janpath Market, Connaught Place, New Delhi, Delhi 110001',
    budget: { min: 8000, max: 15000 },
    status: 'Open for Bidding',
    deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    jobStartDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
    postedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    bids: bids['JOB-20240922-2B4C'] || [],
    comments: [],
    completionOtp: '846201',
  },
  {
    id: 'JOB-20240915-3C5D',
    title: 'Residential 4-Camera Security Installation',
    description: "Seeking an installer for a standard 4-camera setup for a single-family home. Cameras to be placed at the front door, back door, driveway, and backyard. Simple setup with a DVR and mobile viewing required. Straightforward project for an experienced residential installer.",
    jobGiver: findUser('JOBGIVER-20230120-BREN'),
    location: '600001, Park Town',
    fullAddress: '15, 3rd Main Road, Besant Nagar, Chennai, Tamil Nadu 600090',
    status: 'Awarded',
    awardedInstaller: 'INSTALLER-20230510-CARL',
    deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Bidding ended 2 days ago
    jobStartDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Starts in 2 days
    postedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
    bids: bids['JOB-20240915-3C5D'],
    comments: [],
    completionOtp: '554289',
  },
  {
    id: 'JOB-20240825-4D6E',
    title: 'Maintenance and Check-up for existing system',
    description: "Need a technician to perform a full system check on our 16-camera setup. This includes cleaning lenses, checking all connections, ensuring the NVR is recording properly, and verifying that remote access is functional. The system is 2 years old.",
    jobGiver: findUser('USER-20220815-ALEXJ'),
    location: '500001, Begumbazar',
    fullAddress: 'Plot 42, Jubilee Hills, Hyderabad, Telangana 500033',
    budget: { min: 2000, max: 4000 },
    status: 'Completed',
    awardedInstaller: 'USER-20220815-ALEXJ',
    rating: 5,
    deadline: new Date('2024-08-28T23:59:59Z'), // Old date
    jobStartDate: new Date('2024-09-01T09:00:00Z'), // Old date
    postedAt: new Date('2024-08-25T10:00:00Z'), // Old date
    bids: [],
    comments: [],
    completionOtp: '112233',
  },
  {
    id: 'JOB-20240924-4D5E',
    title: 'Install 32 PTZ Cameras in a Warehouse',
    description: 'We require a comprehensive surveillance solution for our new logistics warehouse. This involves installing 32 Pan-Tilt-Zoom (PTZ) cameras at strategic locations, setting up a centralized monitoring station with a Video Management System (VMS), and ensuring full wireless coverage across the facility. Only verified installers with experience in large-scale industrial projects should apply.',
    jobGiver: findUser('JOBGIVER-20220430-FION'),
    location: '400050, Bandra West',
    fullAddress: 'Unit 5, Shakti Logistics Park, Bhiwandi, Thane, Maharashtra 421302',
    budget: { min: 40000, max: 75000 },
    status: 'Open for Bidding',
    deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    jobStartDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    postedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    bids: bids['JOB-20240924-4D5E'],
    comments: comments['JOB-20240924-4D5E'] || [],
    completionOtp: '987654',
  },
  {
    id: 'JOB-20240917-5E6F',
    title: 'Boutique Shop Camera Setup with Covert Cameras',
    description: 'Looking for a discreet security camera installation for a high-end boutique. The project requires 4-6 cameras, some of which must be covert or hidden. Aesthetics are very important. The system should be accessible remotely and have high-quality recording capabilities.',
    jobGiver: findUser('USER-20240110-HANN'),
    location: '500032, Sanjeev Reddy Nagar',
    fullAddress: 'Shop 3, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500032',
    budget: { min: 9000, max: 18000 },
    status: 'Awarded',
    awardedInstaller: 'USER-20220815-ALEXJ',
    deadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Bidding ended 3 days ago
    jobStartDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Starts tomorrow
    postedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    bids: bids['JOB-20240917-5E6F'],
    comments: [],
    completionOtp: '123789',
  },
  {
    id: 'JOB-20240922-6F7G',
    title: 'Solar-Powered Camera for Remote Farm',
    description: 'Need to install one or two solar-powered 4G cameras to monitor a remote agricultural property. The location has no power or Wi-Fi. The installer must provide a complete solution including the solar panel, battery, and 4G camera setup. ',
    jobGiver: findUser('JOBGIVER-20230120-BREN'),
    location: '800001, Bankipore',
    fullAddress: 'Near NH31, Bihta, Patna, Bihar 801103',
    budget: { min: 15000, max: 25000 },
    status: 'Open for Bidding',
    deadline: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
    jobStartDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    postedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    bids: [],
    comments: [],
    completionOtp: '741852',
  },
  {
    id: 'JOB-20240816-7G8H',
    title: 'Apartment Complex Access Control & CCTV',
    description: 'We are seeking bids for a full security overall for a 50-unit apartment building. This includes installing cameras in all common areas (lobbies, hallways, parking) and setting up an access control system for the main entrance. The job will be awarded to a company that can handle both aspects.',
    jobGiver: findUser('JOBGIVER-20220430-FION'),
    location: '110001, Baroda House',
    fullAddress: 'DLF Crest, Sector 54, Gurugram, Haryana 122011',
    budget: { min: 80000, max: 150000 },
    status: 'In Progress',
    awardedInstaller: 'INSTALLER-20211111-ETHA',
    deadline: new Date('2024-09-01T23:59:59Z'), // Bidding ended
    jobStartDate: new Date('2024-09-03T09:00:00Z'), // Started
    postedAt: new Date('2024-08-16T11:00:00Z'), // Posted
    bids: [],
    comments: [],
    completionOtp: '963258',
  },
  {
    id: 'JOB-20240918-8J9K',
    title: '4 Camera setup for a new house',
    description: 'This is for a new house construction. Need 4 cameras installed. 2 outdoor, 2 indoor. All wiring needs to be concealed. The job giver will provide cameras and NVR.',
    jobGiver: findUser('JOBGIVER-20220430-FION'),
    location: '400050, Bandra West',
    fullAddress: 'Villa 23, Hiranandani Gardens, Powai, Mumbai, Maharashtra 400076',
    budget: { min: 5000, max: 9000 },
    status: 'Cancelled',
    deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Bidding ended 2 days ago
    jobStartDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Was supposed to start tomorrow
    postedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
    bids: bids['JOB-20240918-8J9K'],
    comments: [],
    completionOtp: '753159',
  },
  {
    id: 'JOB-20240801-K2L3',
    title: 'Corporate Office Full Security System',
    description: 'Installation of 15 cameras, access control on 5 doors, and a central monitoring room setup for a corporate office. High-end equipment required.',
    jobGiver: findUser('JOBGIVER-20220430-FION'),
    location: '500032, Sanjeev Reddy Nagar',
    fullAddress: 'Cyber Towers, HITEC City, Hyderabad, Telangana 500081',
    budget: { min: 20000, max: 30000 },
    status: 'Completed',
    awardedInstaller: 'USER-20220815-ALEXJ',
    rating: 4,
    deadline: new Date('2024-08-05T23:59:59Z'), // Old date
    jobStartDate: new Date('2024-08-07T09:00:00Z'), // Old date
    postedAt: new Date('2024-08-01T14:00:00Z'), // Old date
    bids: bids['JOB-20240801-K2L3'],
    comments: [],
    completionOtp: '852963',
  },
  {
    id: 'JOB-20240715-M4N5',
    title: 'School Campus Camera Overhaul',
    description: 'Full overhaul of a school campus security system. Requires 20+ cameras, NVR, and integration with an existing alert system.',
    jobGiver: findUser('JOBGIVER-20230120-BREN'),
    location: '110001, Bengali Market',
    fullAddress: 'Modern School, Barakhamba Road, New Delhi, Delhi 110001',
    budget: { min: 50000, max: 80000 },
    status: 'Completed',
    awardedInstaller: 'USER-20220815-ALEXJ',
    rating: 5,
    deadline: new Date('2024-07-20T23:59:59Z'), // Old date
    jobStartDate: new Date('2024-07-22T09:00:00Z'), // Old date
    postedAt: new Date('2024-07-15T12:00:00Z'), // Old date
    bids: [],
    comments: [],
    completionOtp: '951753',
  },
  {
    id: 'JOB-20240925-P2Q3',
    title: 'Connect Two Buildings with Wireless Bridge',
    description: 'We need to link the camera systems of two adjacent buildings. This requires setting up a point-to-point wireless bridge. The distance is approximately 200 meters with clear line of sight. The goal is to have a unified view of cameras from both buildings on a single NVR.',
    jobGiver: findUser('USER-20220815-ALEXJ'),
    location: '500001, Darul Shifa',
    fullAddress: 'Gachibowli Financial District, Nanakramguda, Hyderabad, Telangana 500032',
    budget: { min: 25000, max: 40000 },
    status: 'Open for Bidding',
    deadline: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000), // 9 days from now
    jobStartDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000), // 11 days from now
    postedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    bids: bids['JOB-20240925-P2Q3'],
    comments: comments['JOB-20240925-P2Q3'] || [],
    completionOtp: '357159',
  },
  {
    id: 'JOB-20240928-R4S5',
    title: 'Troubleshoot NVR Not Recording',
    description: 'Our 8-camera NVR has stopped recording on 3 channels. The live view is working fine, but no footage is being saved from the affected cameras. We need an experienced technician to diagnose and fix the issue. Might be a hard drive issue or configuration problem.',
    jobGiver: findUser('USER-20240110-HANN'),
    location: '500032, Sanjeev Reddy Nagar',
    fullAddress: 'My Home Bhooja, Raidurg, Hyderabad, Telangana 500081',
    budget: { min: 2000, max: 3500 },
    status: 'Open for Bidding',
    deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    jobStartDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    postedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    bids: bids['JOB-20240928-R4S5'],
    comments: [],
    completionOtp: '486246',
  },
  {
    id: 'JOB-20240910-T6U7',
    title: 'Cafe Interior and Exterior Camera Setup',
    description: 'Setting up 4 dome cameras inside a small cafe and 2 bullet cameras for the exterior. Need clear footage of the entrance and seating areas. The job includes all wiring and setup on a new NVR system.',
    jobGiver: findUser('JOBGIVER-20230120-BREN'),
    location: '600001, Chennai G.P.O.',
    fullAddress: 'Amethyst Cafe, Whites Road, Royapettah, Chennai, Tamil Nadu 600014',
    budget: { min: 15000, max: 22000 },
    status: 'Completed',
    awardedInstaller: 'INSTALLER-20230510-CARL',
    rating: 5,
    deadline: new Date('2024-09-12T23:59:59Z'), // Old date
    jobStartDate: new Date('2024-09-15T09:00:00Z'), // Old date
    postedAt: new Date('2024-09-10T09:00:00Z'), // Old date
    bids: bids['JOB-20240910-T6U7'],
    comments: [],
    completionOtp: '246810',
  },
  {
    id: 'JOB-20240905-V8W9',
    title: 'Bidding Closed Job Example',
    description: 'This is a job where the bidding period has ended, but the job giver has not yet selected an installer. It should appear as "Bidding Closed".',
    jobGiver: findUser('JOBGIVER-20220430-FION'),
    location: '800001, Bankipore',
    fullAddress: 'Fraser Road Area, Patna, Bihar 800001',
    budget: { min: 5000, max: 10000 },
    status: 'Bidding Closed',
    deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Bidding ended 1 day ago
    jobStartDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // Starts in 3 days
    postedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    bids: [
      {
        id: 'bid-15-1',
        installer: findUser('INSTALLER-20230801-GEOR'),
        amount: 8000,
        timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        coverLetter: 'I can do this job.'
      },
    ],
    comments: [],
    completionOtp: '135790',
  },
  {
    id: 'JOB-20240919-X1Y2',
    title: 'Direct Award Job Example',
    description: 'This is a job that was awarded directly to an installer, bypassing the public bidding process. The job should appear as "Awarded".',
    jobGiver: findUser('JOBGIVER-20220430-FION'),
    location: '799001, Agartala H.O',
    fullAddress: 'MBB College Area, Agartala, Tripura 799004',
    budget: { min: 6000, max: 12000 },
    status: 'Awarded',
    awardedInstaller: 'INSTALLER-20230801-GEOR',
    deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    jobStartDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), 
    postedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    bids: [],
    comments: [],
    completionOtp: '102030',
  },
];
