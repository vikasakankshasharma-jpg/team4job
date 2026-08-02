# Pull Request 1: Case Management Core (Phase 2A)

## Summary
This PR introduces the foundational enterprise case governance engine for disputes, refunds, and admin incidents, strictly following the Phase 2A implementation plan.

## Changes Included
- **Domain Types:** `src/domains/cases/case.types.ts` (CaseStatus, CasePriority, CaseType, CaseLinkedEntity, CaseTimelineEntry, CaseApproval)
- **Repository Layer:** `src/domains/cases/case.repository.ts` (CRUD, assignment, timeline appends, approval appends, integrated with SchemaEnvelope)
- **Service Layer:** `src/domains/cases/case.service.ts` (Lifecycle methods: open, assign, resolve, request/approve dual-control actions)
- **Dispute Linking:** `src/domains/cases/dispute-case-linker.ts` (Auto-links disputes to case entities)
- **REST APIs:** `src/app/api/admin/cases/route.ts` and `[id]` sub-routes for full REST control-plane access.
- **Unit Tests:** `tests/unit/case.service.test.ts` (100% pass rate)

## Verification
- `npm run typecheck` completed with **0 errors**.
- All unit tests passed successfully.
- Code is securely gated behind `checkAdminAccess` RBAC rules.
- Fully audit-logged via `logAdminAction`.

## Status
✅ Committed to `main` branch.
