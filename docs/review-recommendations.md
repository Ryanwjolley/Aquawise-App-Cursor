# Review Recommendations Tracker

Living document tracking proposed improvements, their status, rationale, and verification notes. Use this to decide what to keep / drop at the end of the review cycle.

Legend: 
- Status: DONE | IN PROGRESS | PENDING | DEFERRED
- Priority: H (High), M (Medium), L (Low)

## 1. Foundational Sanity (Step 1)
| Item | Status | Priority | Rationale | Notes/Next Verification |
|------|--------|----------|-----------|-------------------------|
| TypeScript typecheck clean | DONE | H | Ensures baseline compile correctness | Passing `tsc --noEmit` |
| Production build succeeds | DONE | H | Valid deployment sanity | `next build` succeeded earlier |
| Dependency audit (SendGrid/form-data issue) | PENDING | M | Mitigate known vulnerability | Track upstream; pin or patch when fix released |
| Remove obsolete AI prototype code | DONE | L | Reduce dead code surface | Removed early in review |

## 2. Environment & Configuration (Step 2)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Central typed env accessor (`env.ts`) | DONE | H | Prevent scattered `process.env` misuse | Implemented; tests adapted with placeholders |
| Expand `.env.example` with required vars | DONE | M | Onboarding clarity | Added Zenner + SUPER_ADMIN |
| Prohibit direct `process.env` in app code | IN PROGRESS | M | Consistency/security | Some remaining references to audit |

## 3. Authentication & Authorization (Step 3)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| RBAC utility tests (`rbac.test.ts`) | DONE | H | Guard permission regressions | Passing |
| Server-side impersonation validation (ignore client roles) | DONE | H | Prevent privilege escalation | Added `assertImpersonation` usage & test |
| Impersonation audit start/end logging | DONE | M | Traceability | Implemented earlier |
| Verify actor token (ID token verification on API routes) | IN PROGRESS | H | Prevent forged user IDs | Helper added; applied to impersonation & notifications routes |
| Protect impersonation end route (actor matches original) | PENDING | M | Stop malicious termination | Compare actor on end |
| Route protection middleware (/admin, /super-admin) | DONE | H | SSR guard & redirect | Cookie issuance integrated in AuthContext |
| Auth session cookie issuance endpoint | DONE | H | Enable middleware enforcement | Added /api/auth/session (POST/DELETE) |
| Limit impersonation session duration | PENDING | L | Reduce long-lived risk | Add TTL & auto-end job |

## 4. Data Integrity & Validation (Step 4)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Add Zod validation for Company & User fetch | DONE | H | Prevent bad data propagation | Added in `firestoreData.ts` |
| Validation for Allocations & Usage | DONE | M | Trusted analytics & alerts | Added `schemas.ts` + integrated in queries |
| Validation for Orders & Notifications | DONE | M | Extend remaining domain entities | Schemas + parsing + tests added |
| Malformed data unit tests (negative gallons, invalid dates) | DONE | M | Ensure rejection paths | Added `schemas.test.ts` |
| Firestore composite index review | PENDING | M | Query performance integrity | Audit queries vs `firestore.indexes.json` |
| Required field enforcement in Security Rules (mirror schemas) | PENDING | H | Defense-in-depth | Update `firestore.rules` after schema finalization |
| Data migration scripts idempotency checks | PENDING | L | Safe re-runs | Add dry-run & checksum logging |

## 5. Performance & Scalability (Upcoming)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Profile heavy dashboard queries (usage aggregation) | PENDING | M | UI responsiveness | Measure with simple timers/logs |
| Lightweight query timing helper in codebase | DONE | L | Foundation for profiling | Added `perf.ts` utility |
| Introduce caching layer (in-memory/LRU for refs) | PENDING | L | Reduce Firestore reads | Only after profiling |
| Batch Firestore reads (Promise.all boundaries) | PENDING | M | Network efficiency | Identify sequential chains |
| Pagination or lazy-loading for large user lists | PENDING | L | Memory/time improvements | Evaluate dataset size threshold |

## 6. Security Hardening (Upcoming)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Enforce auth on all API routes (ID token) | IN PROGRESS | H | Prevent anonymous access | Applied to impersonation, notifications, debug email, zenner routes |
| Rate limiting sensitive routes (impersonation, notifications) | PENDING | M | Mitigate abuse | Edge middleware or in-collection counters |
| CSRF protection for state-changing endpoints | PENDING | M | Reduce cross-site risks | Consider double-submit token for non-JSON fetches |
| Audit & refine Firestore security rules | PENDING | H | Data-level enforcement | Align with new schemas & roles |
| Tighten notification update rule (isRead only) | DONE | M | Principle of least privilege | Rule simplified to allow only isRead flip |
| Secret rotation guidelines (email/ZENNER keys) | PENDING | L | Operational hygiene | Add to README/security docs |

## 7. Observability & Logging (Upcoming)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Central structured logger (level, context) | PENDING | M | Easier debugging | Wrap console or adopt lightweight lib |
| Error boundary coverage (client critical areas) | PENDING | M | UX resilience | Add React error boundary wrapper |
| Server error classification (expected vs unexpected) | PENDING | M | Alert signal quality | Tag errors with code |
| Basic metrics counters (impersonations, notifications sent) | PENDING | L | Ops visibility | Store in Firestore or export logs |

## 8. Testing & Quality (Cross-cutting)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Add tests for impersonation end constraints | PENDING | M | Validate future logic | After end route hardening |
| Add schema negative tests | PENDING | M | Guarantee rejection paths | After additional schemas |
| Lint error elimination (remaining any/warnings) | IN PROGRESS | L | Code health | Continue incremental cleanup |
| CI pipeline (typecheck, lint, test) | PENDING | M | Prevent regressions | GitHub Actions workflow |

## 9. UX / DX Enhancements (Optional)
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Loading skeleton consistency (dashboard sections) | PENDING | L | Visual polish | Audit conditional render patterns |
| Accessible navigation focus states | PENDING | L | A11y compliance | Tailwind outline utilities |
| Developer README expansion (scripts, env, tests) | PENDING | M | Faster onboarding | Document flows & decisions |

## 10. Operational Resilience
| Item | Status | Priority | Rationale | Notes |
|------|--------|----------|-----------|-------|
| Backup/export strategy for critical collections | PENDING | M | Disaster recovery | Outline scheduled export steps |
| Incident response playbook (auth compromise) | PENDING | L | Faster recovery | Add docs section |
| Automated dependency update checks | PENDING | L | Keep current | Enable Renovate or dependabot |

---
### Recently Completed This Session
- Server-side impersonation validation & test.
- Zod validation for Company & User fetch methods.

### How to Use This Doc
Review at the end of each category. Mark items DONE / DEFERRED based on cost-benefit. Remove items deemed unnecessary to maintain lean scope.

### Next Immediate Candidates (High ROI)
1. Firebase ID token verification helper reused across API routes (Security + Auth). 
2. Allocation & Usage schema validation (Data correctness feeding dashboards). 
3. Middleware for route-level auth gating (Prevents client flash / leakage). 

---
(Keep editing this file as progress continues.)
