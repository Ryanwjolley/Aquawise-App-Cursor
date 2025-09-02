# Firestore Security Rules Notes

Summary of rationale behind the `firestore.rules` file.

## Guiding Principles
- Client SDK has read access scoped to its company; write access for critical mutating operations is funneled through server actions (Admin SDK) to enforce RBAC centrally.
- Multi‑tenant isolation: user must be a member document under the target company.
- Minimize client writes: only water order creation (own orders) and marking notifications as read are permitted.
- All allocation, availability, usage aggregation and approval flows are mediated by privileged server code.

## Allowed Client Operations
| Collection | Read | Create | Update | Delete | Notes |
|-----------|------|--------|--------|--------|-------|
| companies | Member only | – | – | – | Settings immutable client side |
| users | Member only | – | – | – | Future: limited self‑profile update |
| userGroups | Member only | – | – | – | Read only for grouping/filtering |
| allocations | Member only | – | – | – | Display user budgets |
| waterAvailabilities | Member only | – | – | – | Display system capacity |
| waterOrders | Member only | Own order only | – | – | Admin review via server |
| usage | Member only | – | – | – | Ingest via Admin SDK scripts/server |
| notifications | Owner only | – | isRead only | – | Owner can mark read |

## Future Enhancements
- Add custom claims for per-company role caching to cut one document read on each call.
- Introduce granular validation (e.g. max date span, positive numbers) if any client writes beyond current minimal set are enabled.
- Consider moving usage to a top-level `usage` collection with companyId field + composite indexes if volume grows > 1M docs per company.
