/**
 * Test Credentials and Constants
 */

export const TEST_ACCOUNTS = {
    jobGiver: {
        email: 'jobgiver@example.com',
        password: 'Test@1234',
        role: 'Job Giver',
    },
    installer: {
        email: 'installer@example.com',
        password: 'Test@1234',
        role: 'Installer',
    },
    admin: {
        email: 'vikasakankshasharma@gmail.com',
        password: 'Test@1234',
        role: 'Admin',
    },
};

export const TEST_CREDENTIALS = {
    aadhar: '999999990019',
    otp: '123456',
    testCard: {
        number: '4111111111111111',
        cvv: '123',
        expiry: '12/25',
        name: 'Test User',
    },
    declinedCard: {
        number: '4000000000000002',
        cvv: '123',
        expiry: '12/25',
    },
};

export const TEST_JOB_DATA = {
    title: 'Install 4 CCTV Cameras for Retail Shop',
    description: 'Need professional installation of 4 outdoor cameras with DVR setup and remote access configuration. The cameras should cover the main entrance, cash counter, storage area, and parking lot.',
    category: 'New Installation',
    skills: 'CCTV Installation, Wiring, DVR Configuration',
    pincode: '560001',
    house: '1st Floor',
    street: '123 MG Road, Bangalore, Karnataka',
    landmark: 'Near City Center Mall',
    minBudget: 8000,
    maxBudget: 12000,
    bidAmount: 7500,
    coverLetter: 'I have 5+ years of experience in CCTV installation. I can complete this project within 2 days with high-quality equipment and professional wiring. I guarantee all work and provide 1-year warranty on installation.',
};

export const TIMEOUTS = {
    short: 15000,
    medium: 60000,
    long: 90000,
    payment: 90000,
};

export const ROUTES = {
    login: '/login',
    dashboard: '/dashboard',
    postJob: '/dashboard/post-job',
    postedJobs: '/dashboard/posted-jobs',
    browseJobs: '/dashboard/jobs',
    myBids: '/dashboard/my-bids',
    transactions: '/dashboard/transactions',
    profile: '/dashboard/profile',
};

export const JOB_STATUSES = {
    openForBidding: 'Open for Bidding',
    pendingAcceptance: 'Pending Acceptance',
    pendingFunding: 'Pending Funding',
    inProgress: 'In Progress',
    pendingConfirmation: 'Pending Confirmation',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

/**
 * Helper function to get date strings for form inputs
 */
export function getDateString(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

export function getDateTimeString(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().slice(0, 16);
}

/**
 * Helper function to generate unique job title
 */
export function generateUniqueJobTitle(): string {
    const timestamp = Date.now();
    return `${TEST_JOB_DATA.title} - ${timestamp}`;
}
