# Pull Request 2: Dispute Triage Priority Queue (Phase 2B)

## Summary
This PR implements the intelligent dispute triage queue based on the CQRS read-model architecture and deterministic weighted scoring formula. It replaces chronological queues with business-driven prioritization.

## Changes Included
- **Triage Weight Configuration:** `src/lib/constants/triage-weights.ts` (slaProximity, amountAtRisk, customerValue, fraudLikelihood, dataCompletenessPenalty)
- **Scoring Engine:** `src/domains/cases/triage-score.service.ts` (Deterministic score calculation + explainability breakdown object)
- **Queue Materialization:** `src/domains/cases/case-queue.repository.ts` 
  - `materializeQueue`: batch writes pre-scored documents.
  - `claimNext`: Transactional Compare-and-Set loop over top 3 unassigned records (retries on contention).
  - Built-in stable tie-breakers (priorityBucket, openedAt, caseId).
- **Background Cron Trigger:** `src/app/api/cron/triage-recompute/route.ts` 
  - Gated by `CRON_SECRET` Bearer token.
  - Mitigates replay attacks with `X-Cron-Timestamp` freshness check (±5 min).
- **Admin Claim API:** `src/app/api/admin/cases/queue/route.ts` (Gated by RBAC, writes tamper-evident audit logs on claim action)
- **Unit Tests:** `tests/unit/triage-score.service.test.ts` (Validates math, partial boundaries, max boundaries, explainability fields)

## Verification
- `npm run typecheck` completed with **0 errors**.
- All dependencies verified.
- Code is securely gated behind `checkAdminAccess` RBAC rules and `CRON_SECRET`.
- Fully audit-logged via `logAdminAction`.

## Status
✅ Committed to `main` branch (fd1a4457).
