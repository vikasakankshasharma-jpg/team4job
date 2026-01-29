# Route Groups Structure (Planned)

This document outlines the recommended App Router structure using Next.js 14 route groups.

## Proposed Structure

```
app/
├── (public)/              # Unauthenticated pages
│   ├── page.tsx          # Landing page (move from app/page.tsx)
│   ├── about/
│   ├── pricing/
│   ├── privacy-policy/
│   └── terms-of-service/
│
├── (auth)/               # Authentication pages
│   ├── login/
│   ├── register/
│   └── reset-password/
│
├── (dashboard)/          # Authenticated routes
│   ├── layout.tsx       # Shared dashboard layout
│   ├── job-giver/       # Job Giver specific
│   │   ├── page.tsx    # Dashboard home
│   │   ├── jobs/
│   │   ├── posted-jobs/
│   │   └── profile/
│   │
│   ├── installer/       # Installer specific
│   │   ├── page.tsx    # Dashboard home
│   │   ├── jobs/       # Browse jobs
│   │   ├── my-bids/
│   │   ├── my-jobs/    # Awarded jobs
│   │   └── profile/
│   │
│   └── admin/          # Admin specific
│       ├── page.tsx
│       ├── users/
│       ├── jobs/
│       └── audit-logs/
│
└── api/                # API routes (unchanged)
    └── ...
```

## Benefits

### 1. Clear Separation
- Public vs. authenticated content
- Role-specific dashboards
- Easier to apply middleware

### 2. Better Organization
- Related pages grouped together
- Shared layouts for each section
- Easier navigation

### 3. Performance
- Can prefetch entire route group
- Shared layout reduces bundle size
- Better code splitting

## Implementation Steps

### Step 1: Create Route Groups (Structure Only)

```bash
mkdir app/(public)
mkdir app/(auth)
mkdir app/(dashboard)
mkdir app/(dashboard)/job-giver
mkdir app/(dashboard)/installer
mkdir app/(dashboard)/admin
```

### Step 2: Move Existing Pages

Move pages to appropriate groups:
- `app/page.tsx` → `app/(public)/page.tsx`
- `app/login` → `app/(auth)/login`
- `app/dashboard` → `app/(dashboard)/job-giver` or `app/(dashboard)/installer`

### Step 3: Create Shared Layouts

Each route group gets its own layout:
- `app/(public)/layout.tsx` - Public header/footer
- `app/(dashboard)/layout.tsx` - Dashboard sidebar/nav
- `app/(dashboard)/job-giver/layout.tsx` - Job giver specific nav

### Step 4: Update Navigation

Update links to use new paths:
- `/dashboard/posted-jobs` → `/dashboard/job-giver/posted-jobs`
- `/dashboard/browse-jobs` → `/dashboard/installer/jobs`

## Current Status

✅ API routes refactored to use domain services  
✅ Route group structure planned  
⏳ Actual file movement pending (requires testing)

## Migration Note

**Do NOT move files yet** until:
1. All API routes are refactored
2. Components updated to use services
3. E2E tests pass
4. User confirms readiness

Moving files now would break existing navigation. Complete refactoring first, then reorganize structure.

## Alternative: Hybrid Approach

Keep current structure but introduce new route groups for NEW features:
- Keep existing `app/dashboard/**` working
- Add `app/(dashboard)/job-giver/**` for refactored pages
- Gradually migrate page by  page
- Less risky, allows incremental rollout
