# Pilot Test Plan (Single Company Trial)

Version: 1.0  
Status: Draft (convert to Final after dry run)  
Owner: Engineering / QA  
Target Pilot Start: TBD

---
## 1. Purpose & Scope
Establish a structured, repeatable validation path to qualify the AquaWise application for a controlled single-company pilot. Focus: core RBAC, impersonation, water order creation, notifications (SendGrid), mock Zenner usage sync, and basic reliability/rollback readiness.

Out of Scope (for this pilot): real Zenner production integration, full telemetry pipeline, extensive performance benchmarking, broad UI accessibility audit.

---
## 2. Environments
| Environment | Purpose | Notes |
|-------------|---------|-------|
| Local Dev | Developer iteration, emulator (future) | Can run seeding + mock sync manually |
| Pilot (Vercel) | External company access | Uses real Firebase project / SendGrid restricted key |
| (Optional) Staging | Future regression sandbox | Not required for first pilot |

---
## 3. Accounts & Roles (Seed)
Seed one company `companies/{pilotCompanyId}` with users:
| Role | Count | Notes |
|------|-------|-------|
| super_admin | 1 | Internal oversight / impersonation top-level |
| admin | 1 | Company admin; primary pilot contact |
| manager | 1 | Mid-level operations view |
| customer | 2 | Distinct usage patterns (high / low) |

Optional: One additional customer with no allocations (edge read handling).

---
## 4. Configuration (.env Variables)
All required variables must be present BOTH locally and in Vercel dashboard before start.

```
FIREBASE_PROJECT_ID=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
SUPER_ADMIN_EMAIL=
SENDGRID_API_KEY=   # Restricted / sandbox mode for pilot
SENDGRID_FROM_EMAIL=
ZENNER_BASE_URL=mock
ZENNER_UTILITY=mockUtility
ZENNER_USER=mockUser
ZENNER_PASS=mockPass
LOG_LEVEL=info
```

Validation: Application boot should fail fast if any required value missing.

---
## 5. Seed Data (Minimum)
- Company document: name, defaultUnit, feature flags (as desired).
- Allocations: 1–2 active covering a date span including today.
- Availability (waterAvailabilities): at least one active capacity record.
- Usage: 7 days historical per (at least) high-usage customer.
- Notifications: 2 unread notifications for one customer.
- (Later) Water orders: none initially; created during test.

Provide a `scripts/seed_pilot.js` (future) or manual console inserts.

---
## 6. Test Sequence (Ordered)
Each numbered item includes: Action, Expected Result, Pass Criteria.

1. Deploy & Smoke
- Action: Deploy latest main to Vercel; open base URL.
- Expected: Unauth redirect to /login; no console errors.
- Pass: HTTP 200 login page, build succeeded.

2. Authentication per Role
- Action: Log in as each seeded user.
- Expected: Successful auth; correct landing page / dashboard; no forbidden flashes.
- Pass: All roles reach a dashboard without errors.

3. RBAC Navigation
- Action: Attempt to access an admin-only route as manager/customer.
- Expected: Access denied (redirect or error page) without data leak.
- Pass: Protected UI absent; denial consistent.

4. Impersonation Start/Stop
- Action: super_admin impersonates admin, manager, customer in sequence; end each session.
- Expected: UI label indicates impersonation mode; Firestore `impersonationEvents` start/stop records with active flag toggled.
- Pass: 3 start + 3 end records; roles match matrix.

5. Impersonation Invalid Attempt
- Action: manager tries to impersonate admin.
- Expected: Clean error message, no impersonationEvent created.
- Pass: Error surfaced; zero new event docs.

6. Company & User Profile Fetch
- Action: Load company settings screen & user profile pane.
- Expected: Values populated (name, units, flags) with safe fallbacks.
- Pass: No null/undefined rendering issues.

7. Allocation & Availability Display
- Action: Navigate to allocation list & availability view.
- Expected: Seeded records render; dates & quantities formatted.
- Pass: No runtime errors; correct counts.

8. Water Order Create (Valid)
- Action: Customer creates order within valid date window / required fields.
- Expected: Doc created under `waterOrders`; UI confirmation.
- Pass: Record visible; status = pending.

9. Water Order Invalid (Temporal)
- Action: Create order with endDate < startDate.
- Expected: Client-side validation blocks or server rejects gracefully; no Firestore write.
- Pass: No new doc; user sees validation message.

10. Notifications Read Toggle
- Action: Mark unread notifications as read.
- Expected: Only `isRead` updates; badge count decrements.
- Pass: Firestore doc diff limited to isRead.

11. SendGrid Email (Spike Alert Simulation)
- Action: Manually insert small cumulative usage then large delta triggering spike logic.
- Expected: Email send (sandbox) logged, spike write skipped (or flagged) per code path.
- Pass: Log entry + (sandbox) message appearance; no anomalous usage doc.

12. Usage Sync (Mock) – First Run
- Action: Call mock usage sync endpoint.
- Expected: New usage docs appended; cumulative values consistent.
- Pass: All inserted docs valid; no duplicates for the same date.

13. Usage Sync (Mock) – Idempotency
- Action: Re-run sync immediately.
- Expected: No duplicate day entries; process completes.
- Pass: Document count unchanged except permissible updates.

14. Cross-Company Access Denial
- Action: Attempt (via dev tools) to read another companyId path.
- Expected: Firestore rule denial.
- Pass: Permission error; no data returned.

15. Performance Smoke
- Action: Load dashboard with seeded 500 usage docs (if seeded).
- Expected: Acceptable load (<~2s TTFB subjective) and UI responsive.
- Pass: No timeouts / memory warnings.

16. Logging Consistency
- Action: Review Vercel logs while performing key actions.
- Expected: Structured or at least consistently prefixed entries for impersonation, sync, spike attempt.
- Pass: All key events appear once; no noisy stack traces.

17. Rollback Drill
- Action: Redeploy previous build version.
- Expected: Revert completes; app operational.
- Pass: Smoke test passes post-rollback.

---
## 7. Automation Candidates
| Target | Type | Status |
|--------|------|--------|
| Role matrix | Unit (existing) | Present |
| Impersonation event lifecycle | Integration | Pending |
| Usage sync idempotency | Integration | Pending |
| Notification mark read | Integration | Pending |
| Security rules (emulator) | Rules test | Deferred |

---
## 8. Exit / Go-Live Criteria
All must be true:
- All 17 sequence steps pass.
- Zero Severity 1 defects open.
- Impersonation events balanced (no lingering active beyond session end).
- At least one spike alert email successfully processed (sandbox acceptable).
- Usage sync idempotency confirmed.
- Rollback verified.

---
## 9. Defect Severity & Actions
| Severity | Definition | Action |
|----------|------------|--------|
| 1 | Security, data corruption, auth bypass | Block release; immediate fix |
| 2 | Core feature broken for any role | Fix before pilot or provide workaround accepted by pilot admin |
| 3 | Cosmetic / minor UX / log noise | Backlog; optional pre-pilot fix |

---
## 10. Rollback Plan
1. Identify last healthy Vercel deployment (UI).  
2. Re-deploy (promote) prior build.  
3. If data issue: export affected collections (Firestore export) & restore manually or patch script.  
4. Disable mock sync endpoint if generating bad writes.  
5. Communicate outage window (<30 min target) to pilot contact.

---
## 11. Monitoring During Pilot (Manual)
| Event | Check | Frequency |
|-------|-------|-----------|
| Impersonation sessions | Active flag stale | Daily |
| Spike alerts | Email/log presence | Daily |
| Usage sync | Idempotency, doc growth | After each run |
| Errors | Vercel logs scanning | Daily |

---
## 12. Post-Pilot Wrap
- Export pilot company data snapshot.
- Summarize metrics: actions taken, spike events, usage doc counts.
- Collect role-based feedback (admin vs manager vs customer).
- Decide on scope for second iteration (telemetry, real Zenner).

---
## 13. Future Enhancements (Deferred)
- Structured logger + correlation IDs.
- Metrics store (OpenTelemetry / custom events).
- Emulator-based rules suite in CI.
- Full email template test harness.
- Real Zenner integration & load test.
- Pagination + aggregation pipeline for usage.

---
## 14. Appendices
A. Script Ideas (not yet implemented):
- `scripts/seed_pilot.js`: Seed initial data from JSON config.
- `scripts/generate_spike.js`: Insert synthetic spike scenario.
- `scripts/validate_usage_idempotency.js`: Re-run sync and diff doc counts.

B. Sample Manual Spike Procedure:
1. Insert usage doc day N with cumulative = 100.  
2. Attempt to insert delta 1000 ( > 3x ) via mock sync or manual script.  
3. Expect skip + email.  

---
Document ends.
