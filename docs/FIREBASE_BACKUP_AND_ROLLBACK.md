# Production Firebase Backup & Rollback Protocol

## 1. Automated Backups
Firebase Firestore supports automated scheduled backups via Google Cloud Storage.
Before MVP launch, ensure you have enabled Daily Backups in the Firebase Console:
- Go to Firestore Database -> Backups
- Enable Daily Backups with at least a 7-day retention period.

## 2. Point-in-Time Recovery (PITR)
For enterprise-grade safety, enable PITR. This allows reverting the database to any exact minute within the last 7 days.
- In Google Cloud Console -> Firestore -> Data
- Click 'Edit' and enable PITR.

## 3. Rollback Procedure
If a catastrophic failure or data corruption occurs (e.g., from a malicious deployment or critical bug):

### Option A: Using PITR (Recommended for precision)
Run the following gcloud command to export the database at the precise minute before the corruption:
\\\ash
gcloud firestore export gs://[YOUR_BACKUP_BUCKET]/recovery-point \\
    --snapshot-time="2026-08-24T12:00:00Z"
\\\
Then import it back:
\\\ash
gcloud firestore import gs://[YOUR_BACKUP_BUCKET]/recovery-point
\\\

### Option B: Restoring a Daily Backup
Navigate to the Firebase Console -> Firestore -> Backups.
Select the latest known good backup and click "Restore". This will restore data into a new database or overwrite specific collections.

## 4. B2B Dealer Audit Ledger
Thanks to the Immutable Event Ledger (\job_events\) implemented in Phase 9, if mutable \jobs\ documents are corrupted, we can reconstruct the exact financial and operational history of any Dealer directly from the event ledger without needing a full database rollback.
