
import { Job, User, Bid, Comment, Dispute, PrivateMessage } from './types';
import { PlaceHolderImages } from './placeholder-images';

// This file now only exports the lists of skills and placeholder images.
// The actual user and job data is now managed entirely by the database seeding script
// located in `src/lib/firebase/seed.ts`. This ensures a single source of truth
// for demo data and prevents inconsistencies between the frontend and the database.

export let jobs: Job[] = [];
export let users: User[] = [];
export let bids: Bid[] = [];
export let comments: Comment[] = [];
export let disputes: Dispute[] = [];
export let privateMessages: PrivateMessage[] = [];

export const allSkills = ["ip camera", "nvr setup", "cabling", "troubleshooting", "ptz", "vms", "access control", "analog cameras", "wireless cameras", "fiber optics", "thermal cameras"];
