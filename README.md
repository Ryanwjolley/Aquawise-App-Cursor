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

## Zenner StealthAMI Integration (Mock Phase)

The Zenner integration currently operates in mock mode for UI & workflow validation.

Manual endpoints (POST):
 - `/api/integrations/zenner/usage` (mock usage sync)
 - `/api/integrations/zenner/users` (mock user sync)

Environment variables (real mode planned):
```
ZENNER_BASE_URL=https://stealthami.example
ZENNER_UTILITY=yourUtility
ZENNER_USER=yourUser
ZENNER_PASS=yourPassword
SUPER_ADMIN_EMAIL=alerts@example.com
```

Usage writes are stored in `companies/{companyId}/usageData` with `_cumulative` tracking.

Spike protection: deltas > 3x prior cumulative reading are skipped and an alert email is attempted.

Daily scheduled job placeholder: `zennerDailySync` (Firebase Cloud Function) currently logs only.

## Testing

Run tests:
```
npm test
```

Current tests are minimal and operate against live Firestore (improvement: add emulator/mocks).
