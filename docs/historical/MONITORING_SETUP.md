# Monitoring & Alerting Setup Guide

This guide describes how to set up automated alerts using Google Cloud Monitoring based on the `monitorSystemHealth` Cloud Function created.

## 1. The Monitoring Filter
The `monitorSystemHealth` function runs every 24 hours and logs specialized messages to Cloud Logging. We will use **Log-based Alerts** to notify the team when issues are found.

### Key Log Queries

**Hostage Fund Alert (Critical)**
Matches logs indicating jobs are stuck in "Pending Confirmation" for > 72 hours.
```text
resource.type="cloud_function"
resource.labels.function_name="monitorSystemHealth"
severity="ERROR"
textPayload:"ALERT"
textPayload:"Pending Confirmation"
```

**Stale Dispute Alert (Critical)**
Matches logs indicating disputes open > 7 days.
```text
resource.type="cloud_function"
resource.labels.function_name="monitorSystemHealth"
severity="ERROR"
textPayload:"ALERT"
textPayload:"disputes are open"
```

---

## 2. Setting Up Alerts in Google Cloud Console

1.  **Go to Cloud Console**: Navigate to [Google Cloud Console](https://console.cloud.google.com).
2.  **Select Project**: Ensure your Firebase project is selected.
3.  **Navigate to Logging**: Go to **Logging** > **Logs Explorer**.
4.  **Create Alert**:
    *   Enter one of the queries above into the query builder.
    *   Click **"Create Alert"** (top right).
5.  **Configure Policy**:
    *   **Alert Name**: e.g., "Critical - Hostage Fund Detected"
    *   **Documentation**: "A job has been stuck in Pending Confirmation for > 72 hours. Please review the job and consider manual release."
    *   **Metric**: "Log entries"
    *   **Time between notifications**: 24 hr (to avoid spamming, but ensure daily reminder)
6.  **Notification Channels**:
    *   Select **Email** (add support lead email)
    *   (Optional) Select **SMS** or **PagerDuty**/webhooks for high urgency.

---

## 3. Uptime Checks (Optional)

To ensure the API itself is responsive, you can set up an Uptime Check.

1.  **Navigate to Monitoring**: Go to **Monitoring** > **Uptime Checks**.
2.  **Create Uptime Check**:
    *   **Title**: "API Health Check"
    *   **Target**: URL
    *   **URL**: `https://<your-project-id>.web.app/api/health` (You may need to create a simple specific endpoint for this)
    *   **Frequency**: 1-5 minutes.
3.  **Alerting**: Create an alert policy if the check fails.

---

## 4. Monitoring Dashboard

You can create a custom dashboard in **Monitoring** > **Dashboards** to visualize:
*   Cloud Function Error Rates
*   Firestore Read/Write Usage
*   Custom Metrics (if you implement `logger.logMetric`)

---

## 5. Testing the Monitor

To verify the monitor works:
1.  Manually run the function via the Firebase Console:
    *   Go to **Functions** tab.
    *   Find `monitorSystemHealth`.
    *   Uses "Testing" tab or Cloud Scheduler to trigger it.
2.  Check **Logs Explorer** for the "Health Check Passed" message.
3.  To test a failure:
    *   Temporarily modify a test job in Firestore: set `status` to 'Pending Confirmation' and `completionTimestamp` to 4 days ago.
    *   Run the function.
    *   Verify an **ERROR** log appears.
    *   Verify you receive an email (if alert configured).
