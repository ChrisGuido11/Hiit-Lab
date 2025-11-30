# UI/UX and Backend Alignment Audit

Purpose: evaluate the current HIIT Coach experience for inconsistencies and bugs that impact the AI-powered personalized workout flow.

## Findings

### 1) Generated workout is not persisted across the workout flow
- The home screen fetches a generated workout for the Daily WOD card, but the workout preview page requests a fresh workout again, so the plan can change between selection and preview.【F:client/src/pages/home.tsx†L45-L139】【F:client/src/pages/workout-detail.tsx†L19-L71】
- The runner screen also fetches a new workout rather than using what the user just previewed, so timers, exercises, and difficulty can mismatch what the user expected.【F:client/src/pages/workout-runner.tsx†L19-L80】
- The completion screen generates yet another workout before saving history, meaning the session stored (and the RPE-based skill score update) may not reflect the workout the user actually completed.【F:client/src/pages/workout-complete.tsx†L19-L98】
- Impact: Users can start a workout, see different content mid-flow, and save inaccurate history/AI feedback, breaking trust in personalization.

### 2) Workout session endpoint can crash when rounds are missing or malformed
- `/api/workout/session` blindly maps over `rounds` from the request body without verifying it exists or is an array.【F:server/routes.ts†L165-L189】
- If the client omits rounds or the body is malformed, the server will throw before validation, returning a 500 instead of a clean validation error. That also risks losing the session write and leaves the client with no guidance.

### 3) Auth session cookies are always marked `secure`, blocking local/HTTP usage
- Session cookies are configured with `secure: true`, which prevents them from being set over HTTP during local development or non-HTTPS test environments.【F:server/replitAuth.ts†L30-L39】
- Because login and callback URLs are also hard-coded to `https://${domain}`, local testing on `http://localhost` will fail to persist sessions, making it hard to exercise the UX and API locally. Users/developers can get stuck in a login loop even when credentials are correct.

## Recommendations
- Persist the generated workout (e.g., via context or server-side session) and pass it through preview → runner → completion so the user, timers, and saved history stay in sync.
- Add request validation for workout session payloads (ensure `rounds` is an array with required fields) and return 400-level errors instead of crashing on missing data.
- Make session cookie security configurable by environment (e.g., `secure: process.env.NODE_ENV === "production"`) and allow HTTP callback URLs in development to avoid blocking local UX testing.
