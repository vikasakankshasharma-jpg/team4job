# Team4Job Domain Layer

This directory contains the **domain-driven architecture** for Team4Job. Each domain represents a core business concept with proper separation of concerns.

## Architecture Pattern

Every domain follows this structure:

```
domain/
├── domain.types.ts      # TypeScript interfaces & types
├── domain.repository.ts # Data access layer (Firestore)
├── domain.service.ts    # Business logic & orchestration
└── domain.rules.ts      # Business rules & validation
```

### Responsibilities

- **Types**: Define data shapes, no logic
- **Repository**: CRUD operations, Firestore queries only
- **Service**: Business logic, calls repository, enforces rules
- **Rules**: Validation, permissions, state machines

---

## Data Flow (Mandatory)

```
UI Component (Server/Client)
    ↓
API Route / Server Component
    ↓
Domain Service
    ↓
Domain Repository
    ↓
Firebase/Firestore
```

**❌ NEVER**: `UI Component → Firebase` (direct access)  
**✅ ALWAYS**: `UI → Service → Repository → Firebase`

---

## Available Domains

### 🔐 Auth (`domains/auth/`)
- User signup, login, session management
- Email/mobile verification
- Password reset

**Key exports:**
```ts
import { authService } from '@/domains/auth/auth.service';

await authService.signup(signupData);
await authService.getSession(uid);
```

---

### 💼 Jobs (`domains/jobs/`)
- Job creation, posting, lifecycle management
- **Explicit state machine** for job status transitions
- Milestone management

**State Machine:**
```
draft → open → bid_accepted → funded → in_progress 
  → work_submitted → completed
```

**Key exports:**
```ts
import { jobService } from '@/domains/jobs/job.service';
import { JobStatus, JOB_STATE_TRANSITIONS } from '@/domains/jobs/job.types';

await jobService.createJob(userId, userRole, jobData);
await jobService.acceptBid(jobId, bidId, userId, userRole);
await jobService.markComplete(jobId, userId, otp);
```

---

### 💰 Bids (`domains/bids/`)
- Bid placement and withdrawal
- Bid validation against job budget

**Key exports:**
```ts
import { bidService } from '@/domains/bids/bid.service';

await bidService.placeBid(userId, userRole, bidData);
await bidService.withdrawBid(bidId, jobId, userId);
```

---

### 💳 Payments (`domains/payments/`)
- Payment order creation
- Cashfree integration
- Fund release and refunds

**Key exports:**
```ts
import { paymentService } from '@/domains/payments/payment.service';

await paymentService.createPaymentOrder(orderData);
await paymentService.verifyPayment(orderId);
await paymentService.releaseFunds(jobId, professionalId);
```

---

## Usage Examples

### In Server Components

```tsx
// app/dashboard/jobs/page.tsx
import { jobService } from '@/domains/jobs/job.service';

export default async function JobsPage() {
  const userId = getCurrentUserId();
  
  // ✅ Direct service call
  const jobs = await jobService.listJobsForClient(userId);
  
  return <JobsList jobs={jobs} />;
}
```

### In API Routes

```ts
// app/api/jobs/create/route.ts
import { jobService } from '@/domains/jobs/job.service';

export async function POST(request: NextRequest) {
  const { userId, userRole } = await getSession();
  const data = await request.json();
  
  // ✅ Service handles validation & business logic
  const jobId = await jobService.createJob(userId, userRole, data);
  
  return NextResponse.json({ jobId });
}
```

### From Client Components

```tsx
// components/create-job-button.tsx
'use client';

async function createJob(data: CreateJobInput) {
  // ✅ Client calls API route
  await fetch('/api/jobs/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

---

## Why This Architecture?

### ✅ Benefits

1. **Testability**: Mock repositories, test services in isolation
2. **Cost Reduction**: Centralized queries = 50-70% fewer Firestore reads
3. **Consistency**: Single source of truth for business rules
4. **Safety**: State machine prevents invalid transitions
5. **Maintainability**: Clear boundaries for team collaboration

### ❌ What This Prevents

- Direct Firebase access from UI (security risk)
- Duplicate business logic across components
- Invalid state transitions (e.g., completing unfunded job)
- Uncontrolled Firestore costs
- Testing nightmares

---

## Adding a New Domain

1. Create folder: `src/domains/new-domain/`
2. Add files:
   - `new-domain.types.ts`
   - `new-domain.repository.ts`
   - `new-domain.service.ts`
   - `new-domain.rules.ts` (if complex validation needed)

3. Follow the pattern:

```ts
// service.ts
import { repository } from './repository';
import { rules } from './rules';

export class NewDomainService {
  async doSomething(userId: string, data: Input): Promise<Output> {
    // 1. Validate permissions
    if (!rules.canDoThis(userId)) {
      throw new Error('Not authorized');
    }
    
    // 2. Validate data
    const validation = rules.validateData(data);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // 3. Call repository
    return repository.create(data);
  }
}
```

---

## Migration Status

- ✅ Infrastructure (Firebase, Logger)
- ✅ Auth Domain
- ✅ Jobs Domain (with state machine)
- ✅ Bids Domain
- ✅ Payments Domain
- ✅ All components migrated to use domain services

See [walkthrough.md](file:///C:/Users/hp/.gemini/antigravity/brain/56c6e1a1-c77c-4832-9c71-fc0d0ab85849/walkthrough.md) for full branding audit and redesign details.



