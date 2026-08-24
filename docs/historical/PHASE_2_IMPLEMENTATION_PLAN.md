# Implementation Plan - Phase 2 QA Fixes

## Goal
Implement the 3 critical "Phase 2" improvements identified in the Final QA Analysis to strictly enforce platform rules and improve UX.

## 1. Blind Bidding (The Anti-Anchoring Fix)
*   **File**: `src/app/dashboard/jobs/[id]/job-detail-client.tsx`
*   **Logic**:
    *   Find the `JobHeader` or relevant section displaying `priceEstimate`.
    *   Add condition: `if (role === 'Installer') return null;` (or replace with "visible only to Job Giver").
    *   Ensure `InstallerBidSection` input doesn't default to the estimate.

## 2. Structured Dispute Evidence (The " No Proof, No Dispute" Rule)
*   **File**: `src/app/dashboard/jobs/[id]/job-detail-client.tsx`
*   **Component**: `JobGiverConfirmationSection` (for Job Giver disputes) and `PendingConfirmationSection` (for Installer disputes).
*   **Change**:
    *   Replace simple "Raise Dispute" button with a `Dialog`.
    *   **Form**:
        *   Reason (Textarea)
        *   Evidence (FileUpload - REQUIRED)
    *   **Action**: Create document in `disputes` collection, update Job status to `Disputed`.

## 3. Public Q&A Board (The Anti-Leakage Communication Tool)
*   **File**: `src/app/dashboard/jobs/[id]/job-detail-client.tsx`
*   **New Component**: `JobQnASection`
*   **Logic**:
    *   Display list of `job.comments`.
    *   **Installer View**: "Ask a Question" input.
    *   **Job Giver View**: "Reply" button on questions.
    *   **Security**: Validates input against Regex to block phone/email.
    *   **Data**: Updates `job.comments` array via `arrayUnion`.

## Execution Order
1.  **Blind Bidding** (Quickest)
2.  **Structured Disputes** (High protection impact)
3.  **Public Q&A** (Complex UI)
