---
paths:
  - "app/plugins/auth.ts"
  - "app/plugins/setup.ts"
  - "app/middleware/auth.global.ts"
  - "app/composables/useAllAuth*.ts"
  - "app/utils/auth.ts"
  - "app/stores/auth.ts"
  - "server/utils/auth.ts"
  - "server/utils/oauth.ts"
  - "server/api/_allauth/**"
  - "server/routes/auth/**"
  - "shared/auth.d.ts"
---

# Authentication

The two-token allauth + Knox model and the rules that keep sessions intact.

## Authentication

Uses [django-allauth](https://docs.allauth.org/) headless API via `nuxt-auth-utils` session management:

- **Server proxy**: `server/api/_allauth/app/v1/` mirrors the full allauth API (auth: login/signup/session/2FA/WebAuthn/email-verify/password-reset/code-auth/provider-token; account: email/password/providers/authenticators including TOTP/recovery-codes/WebAuthn)
- **Client composables**: `useAllAuthAuthentication` (login/signup/OAuth/session), `useAllAuthAccount` (email/password), `useAllAuthSessions` (session management)
- **Auth store** (`app/stores/auth.ts`): Holds config, session, authenticators (TOTP, WebAuthn, recovery codes), provides `setupConfig`/`setupSession`/etc.
- **Auth plugin** (`app/plugins/auth.ts`): Listens to `auth:change` Nuxt hook, determines auth event type (LOGGED_IN/LOGGED_OUT/REAUTHENTICATED/FLOW_UPDATED), handles navigation. Depends on nothing, runs in parallel.
- **Setup plugin** (`app/plugins/setup.ts`): Depends on `auth` plugin. SSR-critical: fetches config + session, then account + cart. Defers sessions/authenticators/notifications to client via `requestIdleCallback` (with `setTimeout` fallback for Safari).
- **WebSocket plugin** (`app/plugins/websocket.client.ts`): Client-only, connects to Django WebSocket at `/ws/notifications/` for real-time notifications. Uses BroadcastChannel and Web Notification API.
- **Auth middleware** (`app/middleware/auth.global.ts`): Global — redirects unauthenticated users from protected routes to `account-login?next=<original-path>`; uses `AuthenticatedRoutes`/`AuthenticatedRoutesSet` from `shared/constants/index.ts`
- **Guest middleware** (`app/middleware/guest.ts`): Prevents logged-in users from accessing login/signup pages
- **Auth flow routing**: `Flow2path` constant maps allauth flow states to page routes (login, signup, MFA, reauthenticate, WebAuthn, recovery codes)
- **Session types**: `shared/auth.d.ts` augments `#auth-utils` with `User`, `UserSession`, `SecureSessionData` (sessionToken, accessToken, oauthParams). Note: `setUserSession` uses defu merge (ignores undefined); use `replaceUserSession` to fully clear session keys
- **Global types**: `global.d.ts` declares `$authState` and `$websocket` on Vue component properties and NuxtApp, plus `auth:change` runtime hook and `window.google` GSI types
