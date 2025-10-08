import { Job, User, Bid, Comment, Dispute, PrivateMessage } from './types';

// This file is now a placeholder. The application fetches data directly from Firestore.
// The demo data is managed exclusively by the database seeding script
// located in `src/lib/firebase/seed.ts`.

export let jobs: Job[] = [];
export let users: User[] = [];
export let bids: Bid[] = [];
export let comments: Comment[] = [];
export let disputes: Dispute[] = [];
export let privateMessages: PrivateMessage[] = [];

export const allSkills = ["ip camera", "nvr setup", "cabling", "troubleshooting", "ptz", "vms", "access control", "analog cameras", "wireless cameras", "fiber optics", "thermal cameras"];
