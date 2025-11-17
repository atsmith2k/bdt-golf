Logout Technical Specification for Next.js + Supabase-based project

Overview and Goals
- Objective: implement a complete and secure sign-out flow that operates consistently across server and client, with robust token revocation, session rotation, CSRF protection, and safe redirects.
- Scope: server-side session invalidation, client-side state clearing, token rotation and revocation, CSRF protection, cookie handling, and cross-device consistency (web and mobile where applicable).
- References to existing implementations and areas of concern:
  - Current auth utilities and normalization: [`src/lib/auth/normalize.ts`](src/lib/auth/normalize.ts:1)
  - Server-side Supabase client: [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts:1)
  - Client Supabase integration: [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts:1)
  - Web login page: [`src/app/(auth)/login/page.tsx`](src/app/(auth)/login/page.tsx:1)
  - Documentation and onboarding context: [`docs/auth.md`](docs/auth.md:1)

Current-state audit (as context)
- Sign-in workflow currently leverages Supabase client on the browser and a SSR/CSR hybrid approach via createServerSupabaseClient, with cookies bridging for SSR contexts.
- No explicit logout API surface exists in the current codebase; sign-out is typically handled by clearing client-side state and calling Supabase signOut in the browser context.
- Observed patterns:
  - Server-side Supabase client integration uses Next.js cookies; client uses createBrowserClient.
  - Normalization utilities exist to process user identifiers for auth but no logout-specific utilities.
- File references to audit:
  - [`src/lib/auth/normalize.ts`](src/lib/auth/normalize.ts)
  - [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts)
  - [`src/app/(auth)/login/page.tsx`](src/app/(auth)/login/page.tsx)
  - API routes scaffold: in this repo, routes under [`src/app/api/...`](src/app/api)

Target end-state specification
- Server-side logout flow
  - Invalidate all server-side sessions associated with the user (per-device/session-store).
  - Rotate session identifiers to prevent session fixation (new sessionId generated and assigned).
  - Revoke access and refresh tokens on the server side, ensuring that previously issued tokens cannot be used.
  - Clear any server-side session state and disable auto-refresh of tokens for the user until re-authenticated.
  - Ensure logout endpoint is idempotent; repeated calls do not cause errors or inconsistent states.
- Client-side logout flow
  - Clear all authentication state in memory and on disk (localStorage, sessionStorage, and any persisted in-app state).
  - Clear cookies associated with authentication (HttpOnly/SameSite policies applied by server; client should ensure cookies are invalidated where accessible).
  - Ensure tokens cannot be reused by clearing or invalidating tokens on the client side and by forcing token rotation on the server.
- Tokens
  - Rotate refresh tokens on logout; ensure the old refresh token becomes unusable.
  - Revoke tokens on the server; ensure non-replayable behavior on both sides.
- CSRF protection
  - Sign-out requests must be CSRF-protected. Approaches:
    - Favor SameSite cookies for session cookies to provide CSRF defense automatically.
    - If using explicit CSRF tokens, require a token in a header (eg, X-CSRF-Token) validated by the server.
  - Logout endpoint must be idempotent and protected against CSRF risks.
- Cookies
  - Secure, HttpOnly cookies must be cleared/invalidated on all clients.
  - SameSite policy should be set to protect against CSRF while allowing legitimate cross-site actions where necessary.
- Redirects
  - After logout, redirect to a safe page (e.g., /login or /logout-success).
  - Implement a whitelist of allowed post-logout targets to prevent open redirects (e.g., /login, /logout-success).
- Cross-client consistency
  - Logout behavior should apply to web and mobile clients via a shared API route and token revocation strategy.
  - Centralized server-side logout API to ensure consistent behavior across clients.
- Edge-case handling
  - No active session: idempotent, simply clear any residual local state and redirect to a safe page.
  - Partially authenticated flows: ensure partial state is cleared and user is fully signed out.
  - Concurrent sessions: revoke sessions across devices; ensure no one device retains a valid session post-logout.
- Security hardening
  - Prevent token reuse with immediate invalidation of existing tokens.
  - Ensure CSRF protections are enforced for sign-out endpoints.
  - Safeguard against replayed sign-out attempts.
- API surface and integration plan
  - New logout API: POST /api/auth/logout (route.ts) with server-side logic to revoke sessions, rotate session IDs, and respond with a minimal payload: { success: true } or { ok: true }.
  - Client integration: lightweight logout helper that calls the logout API, handles redirects safely, and clears in-memory state.
- Patches and code changes plan
  - New API route: src/app/api/auth/logout/route.ts
  - Shared auth utilities: src/lib/auth/logout.ts
  - Server session management: extend src/lib/supabase/server.ts with revokeSession() and rotateSessionId()
  - Client logout call: integrate in a central logout helper (src/lib/auth/logout.ts or similar)
  - Tests: unit tests for logout utilities; integration tests for API route; edge-case coverage
  - Documentation: docs/auth.md updates and a migration note describing new sign-out behavior
- Patch style
  - Provide a unified diff patch across the repository that includes explicit file paths, function signatures, and minimal, surgical changes ready for patch tooling.
- Rollout strategy
  - Backward-compatible, idempotent logout where possible.
  - Feature-flagged rollout if needed; include rollback steps and minimal risk migration notes.
- References to relevant code areas
  - Authentication and normalization: [`src/lib/auth/normalize.ts`](src/lib/auth/normalize.ts:1)
  - Supabase server utilities: [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts:1) and [`src/lib/supabase/service.ts`](src/lib/supabase/service.ts:1)
  - Client/web auth: [`src/lib/supabase/client.ts`](src/lib/supabase/client.ts:1) and [`src/app/(auth)/login/page.tsx`](src/app/(auth)/login/page.tsx:1)
  - API schemas and routes: [`src/app/api/...`](src/app/api)
  - Tests scaffold: existing __tests__ directory under [`src/__tests__`]
  - Docs: [`docs/auth.md`](docs/auth.md:1)

API surface and integration plan
- Logout API endpoint
  - Endpoint: POST /api/auth/logout (route.ts)
  - Request: includes CSRF protection (cookie-based or header-based CSRF token) and authorization credentials (cookie/session).
  - Response: { success: true } or { ok: true, redirect: "/login" }
  - Behavior: revoke sessions, rotate session ID, revoke tokens, and clear server-side session state.
- Client integration
  - A minimal client utility to call the logout API with credentials and handle redirect logic.
  - On success, clear client-side authentication state and navigate to a safe post-logout page.

Tests plan
- Unit tests
  - logout.ts utilities: rotateSessionId(), revokeSession(), clearClientState()
- Integration tests
  - API route: simulate logout with active session, verify server-side revocation, token rotation, and response payload.
  - Edge cases: no active session, multiple devices, partial success in multi-device sign-outs.
- Cross-browser/mobile checks (where applicable)
  - Verify that cookies are cleared and tokens invalidated across devices.

Documentation and migration notes
- docs/auth.md: add a dedicated section describing the new sign-out behavior, CSRF protections, and the new API surface.
- Migration notes: outline any schema/config changes and steps to rollout the new sign-out flow with a minimal risk approach.

Patch and rollout plan
- Create new API route: src/app/api/auth/logout/route.ts
- Create shared logout utilities: src/lib/auth/logout.ts
- Extend server-side logout support: modify src/lib/supabase/server.ts to include revokeSession() and rotateSessionId()
- Client logout integration: add a central logout helper and reference from login/logout flows
- Tests: scaffolding for unit and integration tests
- Documentation: docs/auth.md and a new docs/auth/logout-technical-spec.md (this file) to guide rollout

Edge considerations and rollback
- Non-interactive, idempotent: ensure repeated logout attempts do not fail.
- Rollback: if anything blocks, fallback to a safe, existing logout flow that clears client state and redirects to /login.
- Feature flag: consider gating changes behind a flag during rollout.

Cross-references
- See current auth normalization and server/client integration for alignment:
  - [`src/lib/auth/normalize.ts`]
  - [`src/lib/supabase/server.ts`]
  - [`src/app/(auth)/login/page.tsx`]
  - [`docs/auth.md`]

Patch targets (summary)
- New: docs/auth/logout-technical-spec.md (this document, for traceability)
- New: src/app/api/auth/logout/route.ts
- New: src/lib/auth/logout.ts
- Modified: src/lib/supabase/server.ts (add revokeSession, rotateSessionId)
- Modified: src/app/(auth)/login/page.tsx (hook up optional logout call if needed)
- Tests: new tests under src/__tests__ for logout utilities and API route
- Docs: update docs/auth.md with a migration note

Rollout and rollout-notes
- Phase 1: internal validation and unit tests
- Phase 2: integration tests and API route smoke tests
- Phase 3: gradual rollout with feature flag and monitoring
- Phase 4: full rollout with deprecation window for old logout flow
- Rollback steps: disable feature flag, revert changes, and ensure users are redirected to /login with no residual session state

References
- See previously recorded references for context and current patterns in this repo.

Notes for code implementation
- Follow existing project conventions for TypeScript in Next.js app router and server utilities.
- Maintain backward compatibility: ensure existing login flows are unaffected.
- Ensure CSRF protection strategy aligns with existing cookie settings and cross-site considerations.

Next actions
- Review the Technical Specification and patch plan above.
- Confirm which patch strategy to adopt (unified-diff patch across multiple files or incremental patches).
- If you approve, switch to Code mode to implement the patch plan and then develop corresponding tests and docs.
