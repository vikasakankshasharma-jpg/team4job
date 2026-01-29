# Migration Guide: Converting Existing Code to Domain Architecture

This guide shows **step-by-step examples** of how to migrate existing Team4Job code to use the new domain-driven architecture.

---

## Pattern 1: API Routes

### Before (❌ Old Way)

```typescript
// app/api/jobs/create/route.ts
import { getAdminDb } from '@/lib/firebase/server-init';

export async function POST(req: NextRequest) {
  const db = getAdminDb();
  const { title, description, userId } = await req.json();
  
  // ❌ Business logic in API route
  if (!title || title.length < 5) {
    return NextResponse.json({ error: 'Title too short' });
  }
  
  // ❌ Direct Firestore access
  const jobRef = await db.collection('jobs').add({
    title,
    description,
    jobGiverId: userId,
    status: 'Open for Bidding',
    postedAt: new Date(),
  });
  
  return NextResponse.json({ jobId: jobRef.id });
}
```

### After (✅ New Way)

```typescript
// app/api/jobs/create/route.ts
import { jobService } from '@/domains/jobs/job.service';
import { CreateJobInput } from '@/domains/jobs/job.types';

export async function POST(req: NextRequest) {
  const { userId, userRole } = await getSession(req);
  const jobData: CreateJobInput = await req.json();
  
  // ✅ Service handles validation + business logic
  const jobId = await jobService.createJob(userId, userRole, jobData);
  
  return NextResponse.json({ jobId });
}
```

**Changes Made:**
1. Removed direct Firebase import
2. Removed validation logic (now in `job.service.ts`)
3. API route is now ~5 lines instead of ~20
4. Business logic is testable independently

---

## Pattern 2: Server Components

### Before (❌ Old Way)

```tsx
// app/dashboard/jobs/page.tsx
import { getAdminDb } from '@/lib/firebase/server-init';

export default async function JobsPage() {
  const userId = getCurrentUserId();
  const db = getAdminDb();
  
  // ❌ Direct Firestore query in component
  const snapshot = await db
    .collection('jobs')
    .where('jobGiverId', '==', userId)
    .orderBy('postedAt', 'desc')
    .get();
  
  const jobs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  return <JobsList jobs={jobs} />;
}
```

### After (✅ New Way)

```tsx
// app/dashboard/jobs/page.tsx
import { jobService } from '@/domains/jobs/job.service';

export default async function JobsPage() {
  const userId = getCurrentUserId();
  
  // ✅ Service handles query logic
  const jobs = await jobService.listJobsForJobGiver(userId);
  
  return <JobsList jobs={jobs} />;
}
```

**Changes Made:**
1. Removed Firebase import
2. Removed query logic (now in `job.repository.ts`)
3. Component focused on presentation only
4. Easy to add caching/optimization in repository later

---

## Pattern 3: Client Components (Forms)

### Before (❌ Old Way)

```tsx
'use client';
import { getFirestore } from 'firebase/firestore';

export function CreateJobForm() {
  async function handleSubmit(data) {
    const db = getFirestore();
    
    // ❌ Client accessing Firestore directly
    await addDoc(collection(db, 'jobs'), {
      ...data,
      status: 'Open for Bidding',
    });
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### After (✅ New Way)

```tsx
'use client';

export function CreateJobForm() {
  async function handleSubmit(data) {
    // ✅ Client calls API route
    const response = await fetch('/api/jobs/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const { jobId } = await response.json();
  }
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Changes Made:**
1. Removed Firebase client import
2. Client now calls API instead of Firestore
3. Server (via API) enforces business rules
4. More secure (no client-side Firebase rules bypass)

---

## Pattern 4: Business Logic Extraction

### Before (❌ Scattered Logic)

```typescript
// In Component A:
if (job.status !== 'Open for Bidding') {
  throw new Error('Cannot place bid');
}

// In Component B:
if (job.status === 'Open for Bidding') {
  allowBidding = true;
}

// In API Route:
if (!['Open for Bidding', 'Bidding Closed'].includes(job.status)) {
  return error;
}
```

### After (✅ Centralized Rules)

```typescript
// domains/jobs/job.rules.ts
export class JobRules {
  canPlaceBid(jobStatus: JobStatus): boolean {
    return jobStatus === 'open';
  }
}

// Usage everywhere:
import { jobRules } from '@/domains/jobs/job.rules';

if (!jobRules.canPlaceBid(job.status)) {
  throw new Error('Cannot place bid');
}
```

**Benefits:**
- Single source of truth
- Consistent behavior across app
- Easy to update rules in one place

---

## Migration Checklist

When refactoring a file:

### For API Routes

- [ ] Replace `getAdminDb()` with `import { service } from '@/domains/...'`
- [ ] Move validation logic to service/rules
- [ ] Keep route handler thin (just call service)
- [ ] Use logger instead of `console.log`
- [ ] Return structured responses

### For Server Components

- [ ] Replace Firebase imports with service imports
- [ ] Remove query logic (use service methods)
- [ ] Component should just call `await service.method()`
- [ ] Focus on presentation

### For Client Components

- [ ] Remove direct Firebase access
- [ ] Call API routes instead
- [ ] Let server enforce business rules
- [ ] Use React Query/SWR for caching if needed

### For Business Logic

- [ ] Move to `.rules.ts` or `.service.ts`
- [ ] Remove from components/API routes
- [ ] Write as pure functions when possible
- [ ] Add tests

---

## Example Migration Session

Let's migrate an existing file step-by-step:

### Step 1: Identify Current Pattern

```typescript
// Current: app/dashboard/posted-jobs/page.tsx
import { getAdminDb } from '@/lib/firebase/server-init';

export default async function PostedJobsPage() {
  const db = getAdminDb();
  // ... Firestore queries ...
}
```

### Step 2: Find/Create Appropriate Service

✅ Use `jobService.listJobsForJobGiver(userId)`

### Step 3: Replace Implementation

```typescript
// New: app/dashboard/posted-jobs/page.tsx
import { jobService } from '@/domains/jobs/job.service';

export default async function PostedJobsPage() {
  const userId = await getCurrentUserId();
  const jobs = await jobService.listJobsForJobGiver(userId);
  return <JobsList jobs={jobs} />;
}
```

### Step 4: Remove Old Imports

Delete:
- `import { getAdminDb } from '@/lib/firebase/server-init'`
- `import { getFirestore } from 'firebase/firestore'`

### Step 5: Test

Run the page and verify it works the same way.

---

## Common Patterns

### Pattern: Get Current User Data

```typescript
// ✅ Use user service
import { userService } from '@/domains/users/user.service';

const user = await userService.getProfile(userId);
```

### Pattern: Accept a Bid

```typescript
// ✅ Use job service
import { jobService } from '@/domains/jobs/job.service';

await jobService.acceptBid(jobId, bidId, userId, userRole);
```

### Pattern: Create Payment

```typescript
// ✅ Use payment service
import { paymentService } from '@/domains/payments/payment.service';

const order = await paymentService.createPaymentOrder({
  jobId,
  amount,
  userId,
});
```

---

## Files Created

Migration examples:
- `src/domains/EXAMPLE_API_ROUTES.ts` - API route patterns
- `src/domains/EXAMPLE_SERVER_USAGE.tsx` - Server component patterns
- `src/domains/EXAMPLE_DASHBOARD_SERVER.tsx` - Full dashboard example
- `src/app/api/admin/create-user/route.REFACTORED.ts` - Before/after comparison

---

## Next Steps

1. **Start with API routes** - Easy wins, clear before/after
2. **Move to server components** - Remove Firebase queries
3. **Update client components** - Make them call APIs
4. **Run tests** - Ensure nothing broke

The foundation is complete. Now it's just systematic refactoring using these patterns!
