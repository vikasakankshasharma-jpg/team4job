# 🚀 Local Testing & Scenario Guide

This guide will walk you through setting up your local environment for manual testing and using the automated scenario scripts to validate platform features.

---

## 🛠️ Phase 1: Local Environment Setup

### 1. Install Dependencies
Ensure you have all required packages installed.
```powershell
npm install
```

### 2. Configure Environment Variables
You should have a `.env.local` file. For local testing with emulators, ensure the following is set:
```env
NEXT_PUBLIC_USE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_PROJECT_ID=team4job-beta
```

### 3. Start Firebase Emulators
The emulators provide a safe, local-only version of Auth, Firestore, and Storage.
```powershell
npm run emulators
```
*Wait for the emulators to finish starting. You should see a message saying they are ready.*

### 4. Start Next.js Development Server
In a **new terminal window**, start the web application.
```powershell
npm run dev:emulator
```
Your app will be available at `http://localhost:3000`.

---

## 🎭 Phase 2: Testing Scenarios

We've provided a suite of scripts to quickly set up different platform states.

### Basic Setup (Fresh Start)
Wipes local emulator data and adds fresh test users (Admin, Job Giver, Installer).
```powershell
npm run scenario:fresh
```

### Common Testing Scenarios

| Command | Scenario Description |
| :--- | :--- |
| `npm run scenario:job-ready` | Creates a new job posted by a Job Giver, ready for bidding. |
| `npm run scenario:bid-placed` | Creates a job with 2 active bids from different Installers. |
| `npm run scenario:awarded` | Sets a job to "Awarded" status (Awaiting Funding). |
| `npm run scenario:payment-ready`| Sets a job to "Funded" status, ready for work to start. |
| `npm run scenario:audit-ready`| Resets everything for a full "Universal Master Audit" run. |

---

## 🎖️ The Universal Master Audit

For a complete, end-to-end verification of all roles and interactions (Installer, Client, and Admin) in a single run, use the Master Audit.

1.  **Prepare**: `npm run scenario:audit-ready`
2.  **Run**: `npm run test:audit`

*This test will walk through a 7-Act "play" covering profile updates, bidding, real-time chat, escrow funding, work submission, admin verification, and mutual reviews.*

---

## 🧪 Manual Testing Toolkit

### 🔑 Test Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `vikasakankshasharma_v3@gmail.com` | `Admin_Pass2026!` |
| **Job Giver** | `giver_vip_v3@team4job.com` | `TestUser_2026!` |
| **Installer** | `installer_pro_v3@team4job.com` | `TestUser_2026!` |

### 🛠️ Emulator UI
You can view and modify the raw database at anytime:
- **Firestore Viewer**: `http://localhost:4000/firestore`
- **Auth Viewer**: `http://localhost:4000/auth`

---

## 💡 Best Practices
1. **Always use Emulators**: Ensure `NEXT_PUBLIC_USE_EMULATOR=true` is set to avoid touching live data.
2. **Clear Data**: If things get messy, stop the emulators and restart them with the `--clear` flag if needed (though the `scenario:fresh` script handles most cleanup).
3. **Check Console**: Keep your browser's DevTools console open to catch any underlying API errors.
