# Firebase Admin SDK Emulator Connection Fix

## Problem Analysis

The E2E tests for scenarios 1-25 are configured and ready to run, but they're blocked by a Firebase Admin SDK connection issue on the server side.

**Symptoms**:
- `/api/e2e/seed-users` endpoint returns `500 Internal Server Error`
- Error message: `Error: Error while making request: . Error code: ECONNREFUSED`
- Tests cannot create users in Firebase Auth/Firestore emulators
- All E2E tests timeout waiting for successful login

**Root Cause**:
The `src/infrastructure/firebase/admin.ts` cannot reach the Firebase emulators (localhost:8080 for Firestore, localhost:9099 for Auth) from the Next.js dev server context.

---

## Step-by-Step Fix

### Step 1: Verify Environment Variables are Set

**Check if emulator env vars are in .env.local**:
```powershell
# Open .env.local and verify these lines exist:
Get-Content .env.local | Select-String -Pattern "FIREBASE_AUTH_EMULATOR_HOST|FIRESTORE_EMULATOR_HOST"

# Expected output:
# FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
# FIRESTORE_EMULATOR_HOST=localhost:8080
```

**If missing, add them**:
```
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIRESTORE_EMULATOR_HOST=localhost:8080
```

---

### Step 2: Verify Emulator Ports are Actually Running

```powershell
# Check if ports are listening
netstat -ano | findstr ":8080"    # Firestore
netstat -ano | findstr ":9099"    # Auth

# Expected output for each:
# TCP    0.0.0.0:8080    0.0.0.0:0    LISTENING    [PID]
# TCP    0.0.0.0:9099    0.0.0.0:0    LISTENING    [PID]
```

**If ports are NOT listening**:
```powershell
# Kill any existing node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep 2

# Start fresh emulators
npm run emulators
```

---

### Step 3: Check Dev Server is Using Correct Environment

**Terminal 1 - Start Emulators** (in first tab):
```powershell
npm run emulators
# Wait for: "Emulators are running. Press Ctrl+C to stop."
```

**Terminal 2 - Start Dev Server** (in second tab):
```powershell
npm run dev -- -p 5000
# Wait for: "▲ Next.js 15.5.7"
# Wait for: "✓ Ready in X.Xs"
```

**Terminal 3 - Verify Seed Endpoint** (in third tab):
```powershell
# Test the seed-users endpoint directly
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/e2e/seed-users" `
  -Method POST `
  -ContentType "application/json" `
  -ErrorAction SilentlyContinue

# Check response
$response.StatusCode
$response.Content
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Users seeded successfully",
  "results": [
    {
      "email": "giver_vip_v3@team4job.com",
      "uid": "...",
      "created": true
    },
    {
      "email": "installer_pro_v3@team4job.com",
      "uid": "...",
      "created": true
    },
    {
      "email": "vikasakankshasharma_v3@gmail.com",
      "uid": "...",
      "created": true
    }
  ]
}
```

---

### Step 4: Add Debug Logging to Firebase Admin

**Edit** [src/infrastructure/firebase/admin.ts](src/infrastructure/firebase/admin.ts):

```typescript
export function getAdminApp(): App {
    if (app) return app;

    if (getApps().length > 0) {
        app = getApps()[0];
        return app;
    }

    // DEBUG: Log environment check
    console.log('[ADMIN] Checking emulator environment...');
    console.log('[ADMIN] FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
    console.log('[ADMIN] FIREBASE_AUTH_EMULATOR_HOST:', process.env.FIREBASE_AUTH_EMULATOR_HOST);

    // 0. Emulator-friendly init (no credentials required)
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        console.log('[ADMIN] ✓ Using Firestore Emulator mode');
        app = initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
        });
        return app;
    }

    console.log('[ADMIN] Using production credentials...');
    // ... rest of the function
}
```

**Re-run dev server** and check the logs:
```powershell
npm run dev -- -p 5000
# Should show:
# [ADMIN] Checking emulator environment...
# [ADMIN] FIRESTORE_EMULATOR_HOST: localhost:8080
# [ADMIN] FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
# [ADMIN] ✓ Using Firestore Emulator mode
```

---

### Step 5: Test Seed Users Endpoint with Logging

**Edit** [src/app/api/e2e/seed-users/route.ts](src/app/api/e2e/seed-users/route.ts):

Add logging around line 65:
```typescript
export async function POST(req: NextRequest) {
    if (!isE2eAllowed()) {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        logger.info('[E2E] Starting seed-users request');
        
        const auth = getAdminAuth();
        const db = getAdminDb();
        
        logger.info('[E2E] ✓ Got Auth and Firestore instances');
        logger.info('[E2E] Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
        
        const now = Timestamp.now();
        // ... rest of function
    } catch (error) {
        logger.error('[E2E] Seed users failed', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
```

---

### Step 6: If Still Failing - Network Connectivity Check

**From dev server context, test emulator reachability**:

Create a test endpoint:  [src/app/api/e2e/test-emulators/route.ts](src/app/api/e2e/test-emulators/route.ts):

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const firestoreCheck = await fetch('http://localhost:8080/v1/projects/demo-project/databases/(default)/documents:listCollectionIds', {
            method: 'POST',
        }).then(r => r.ok).catch(() => false);
        
        const authCheck = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit/GetRecaptchaParams', {
            method: 'POST',
        }).then(r => r.ok).catch(() => false);
        
        return NextResponse.json({
            firestore: firestoreCheck ? '✓ OK' : '✗ FAILED',
            auth: authCheck ? '✓ OK' : '✗ FAILED',
        });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
    }
}
```

**Test it**:
```powershell
curl http://localhost:5000/api/e2e/test-emulators

# Expected:
# {"firestore":"✓ OK","auth":"✓ OK"}
```

---

### Step 7: Windows-Specific Firewall Check

**On Windows, emulators might be blocked**:

```powershell
# Check if firewall blocks ports
$FFWTest = netsh advfirewall firewall show rule name="Firebase Emulator" | Select-String "Rule Name"
if (-not $FFWTest) {
    Write-Host "Firebase ports not in firewall rules"
    # Add rule (requires admin)
    # netsh advfirewall firewall add rule name="Firebase Emulator" dir=in action=allow protocol=tcp localport=8080,9099
}

# Alternative: Disable firewall temporarily for testing
# netsh advfirewall set allprofiles state off   # DISABLE
# netsh advfirewall set allprofiles state on    # ENABLE
```

---

## Complete Fresh Start Procedure

If the above steps don't work, try this complete clean restart:

```powershell
# Terminal 1: Clean Restart
Write-Host "🔄 Starting complete clean restart..."

# Kill all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 3

# Kill ports
$ports = @(5000, 8080, 9099)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object OwningProcess -First 1
    if ($proc) {
        Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "✓ Ports cleared, rebuilding..."
npm run build

Write-Host "✓ Build complete, starting services..."
npm run emulators
```

Wait 10 seconds after `npm run emulators` shows "Emulators running", then:

```powershell
# Terminal 2: Dev Server
npm run dev -- -p 5000
```

Wait 5 seconds, then:

```powershell
# Terminal 3: Test Seed Endpoint
Start-Sleep 5
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/e2e/seed-users" -Method POST
$response.Content | ConvertFrom-Json | Format-List
```

---

## Running Tests After Fix

Once seed-users endpoint is working:

```powershell
# Terminal 3: Run E2E tests
npm run test:e2e -- --reporter=html

# After tests complete
playwright show-report

# Or run specific scenario tests
npm run test:e2e -- tests/e2e/admin-smoke.spec.ts
npm run test:e2e -- tests/e2e/job-posting.spec.ts
```

---

## Expected Test Results After Fix

**For Cases 1-25:**
- ✅ All 119 tests should execute (without 500 errors)
- ✅ Users created successfully in emulator
- ✅ Login tests should pass (navigate to dashboard)
- ✅ Job browsing tests should validate all 25 demo scenarios
- ✅ HTML report generated at `playwright-report/index.html`

---

## Reference Files

- [src/infrastructure/firebase/admin.ts](src/infrastructure/firebase/admin.ts) - Firebase Admin initialization
- [src/app/api/e2e/seed-users/route.ts](src/app/api/e2e/seed-users/route.ts) - Seed users endpoint
- [.env.local](.env.local) - Environment variables
- [TEST_RUN_CASES_1_25.md](TEST_RUN_CASES_1_25.md) - Test run report

---

## Still Having Issues?

**Check the dev server console logs**:
```
npm run dev -- -p 5000  2>&1 | Tee-Object dev-server.log
```

**Check the emulator logs**:
```
npm run emulators  2>&1 | Tee-Object emulator.log
```

**Common error codes**:
| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Emulator not running | Verify ports with `netstat -ano` |
| `ETIMEDOUT` | Emulator auth failed | Check credentials in .env.local |
| `E2E endpoint not found` | .env not loaded | Restart dev server |
| `Firebase: Error (auth/user-not-found)` | Users not seeded | Call seed endpoint first |
| `Firewall blocked` | Windows Firewall | Add port exceptions or disable |

---

**Status**: Ready to resume testing after Firebase Admin connection is verified  
**Next Command**: `npm run test:e2e && playwright show-report`

