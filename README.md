# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Development

Install dependencies and start both dev servers:

```
npm install
npm run dev:both
```

Turbopack: http://localhost:3000
Webpack fallback: http://localhost:9002

## Irrigation Usage Integration (Mock)

An irrigation usage sync endpoint is provided (mock mode by default) for manual ingestion during development.

Manual endpoint (POST):
 - `/api/integrations/irrigation/usage` (adds recent mock usage deltas)

Environment variables (for future live mode):
```
IRRIGATION_BASE_URL=https://api.example
IRRIGATION_API_KEY=yourKey
IRRIGATION_TENANT=tenantId
```

Usage writes are stored in `companies/{companyId}/usageData` with `_cumulative` tracking and basic spike protection (delta > 3x previous cumulative skipped).

## Testing

Run tests:
```
npm test
```

Current tests are minimal and operate against live Firestore (improvement: add emulator/mocks).
