# Operational Runbook

## Overview
This document guides Admins and Support staff on handling common operational tasks and incidents.

## 1. System Health Monitoring
**URL**: `/dashboard/admin/system-health`
**Check Frequency**: Daily (Morning/Evening)
- **Stuck Jobs**: Jobs lingering in `funded` or `in_progress` > 7 days.
- **Recent Errors**: Check for spikes in 500 errors.
- **System Status**: Verify it says "Operational".

## 2. Feature Flags
**Collection**: `feature_flags` (Firestore)
**Control**: Edit the document directly in Firebase Console.
- `ENABLE_PAYMENTS`: `true`/`false`. Disables all payment buttons.
- `ENABLE_AI_GENERATION`: `true`/`false`. Hides AI buttons.
- `ENABLE_DISPUTES_V2`: `true`/`false`. Hides Dispute buttons.
> **Emergency**: If Payments fail, set `ENABLE_PAYMENTS` to `false`.

## 3. Common Incidents

### A. Payment Failed but Money Deducted
1. **Verify**: Check Stripe Dashboard for `payment_intent`.
2. **Log**: Check `business_audit_logs` for `PAYMENT_FUNDED` event.
3. **Remedy**:
    - IF money is at Stripe but not in Job: Manually update Job Status to `in_progress` (Developer Access required) OR refund via Stripe.
    - **Escalation**: Assign to Senior Dev (P0).

### B. "Stuck" Job (Installer disappeared)
1. **Identify**: User reports "Installer not responding".
2. **Action**:
    - Use "Admin Dispute" tools (Phase 7) or manually reset Job Status to `open` via Firestore.
    - Check "Last Active" timestamp of Installer.

### C. Spam / Abusive Content
1. **Identify**: User report or AI Flag.
2. **Action**:
    - Go to Job ID in Firestore.
    - Set `visibility: 'hidden'`.
    - Ban User (`users/{userId}/isBanned: true`).

## 4. Rollback Procedure
If a deployment breaks the site:
1. **Frontend**: Revert commit in Git and push.
2. **Firestore Rules**: Use `firebase deploy --only firestore:rules` with previous `firestore.rules` file.
3. **Emergency**: Toggle Maintenance Mode via `system_status/global` -> `{ status: 'maintenance', message: 'Improving our systems.' }`.

## 5. Support Contacts
- **Technical Lead**: dev-team@example.com
- **Stripe Support**: dashboard.stripe.com/support
