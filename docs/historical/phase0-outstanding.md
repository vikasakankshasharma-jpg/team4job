# Phase 0 Outstanding Config Notes

1. **Secrets in repo**
   - `apphosting.yaml` currently declares production-looking values (Firebase project ID, Cashfree client IDs, Gemini/Google keys, Sentry DSN, etc.). These should be moved to the hosting environment’s secret store (`gcloud secret` or Firebase CLI secrets) so the repository stays clean.
   - `next.config.ts` references `process.env.ANALYZE`; any derived config that embeds API keys should also be sourced from secrets (double-check other YAML or JSON files).

2. **TypeScript coverage gaps**
   - `tsconfig.json` explicitly excludes `functions`, `src/functions`, and `hooks`. That means the legacy Firebase Functions tree and the older `hooks/` directory are never type-checked, so regressions there would go unnoticed.
   - Consider either migrating the relevant code into the main `src/` tree or re-including the needed files once they are refactored.

3. **API auth mismatch**
   - Middleware in `src/proxy.ts` expects every protected `/api/*` request to carry a `Bearer` token, while the React app uses a cookie-based session (`auth-token` managed via `setAuthTokenAction`). This mismatch may cause future bots or tooling to fail; the gap should be documented and resolved (e.g., allow cookie auth or remove the middleware from routes that rely on server actions).

4. **Legacy/Auxiliary code**
   - `src/functions/src` and the `functions/` directory both exist, but only the latter is configured in `firebase.json`. The legacy tree (`src/functions`) gets excluded by `tsconfig`, so it will not compile; the extra files should either be removed or re-integrated in a single functions package to avoid drift.
   - Duplicate Firebase initialization stacks (`src/infrastructure/firebase/*` vs `src/lib/firebase/*`) are still both present; the active runtime currently uses `src/infrastructure`, so the legacy `src/lib` copies can be deleted or consolidated once refactoring completes.

No additional blockers were detected during the Phase 0 sweep beyond the items listed above and the cleanup already applied (QueryProvider, Cashfree client, etc.).
