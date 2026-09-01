---
name: auth-debug
model: sonnet
description: >
  Debug and audit the GrooveShop authentication system (django-allauth headless +
  nuxt-auth-utils). Use when the user reports auth issues, session problems, login
  failures, OAuth errors, 2FA problems, WebSocket auth failures, or asks to audit
  the auth system. Also use for "auth not working", "can't log in", "session expired",
  "401 errors", "OAuth broken", "token invalid", "WebSocket auth failed", or
  "check auth".
---

# GrooveShop Auth Debug & Audit Skill

This project uses **django-allauth headless** (app client, `/_allauth/app/v1/`) with
a **Nuxt SSR proxy** + **nuxt-auth-utils** encrypted session cookies. Auth tokens flow:

```
Browser ──(encrypted cookie)──► Nuxt SSR ──(X-Session-Token / Bearer)──► Django
                                    │
                          nuxt-auth-utils session
                          (AES-256-GCM, server-only)
```

**Two token types** (both created per allauth session):
- `sessionToken` — allauth headless session token (`X-Session-Token` header to Django)
- `accessToken` — Knox token (`Authorization: Bearer` to Django REST API + WebSocket query param)

## Key Files

Nuxt paths below are relative to this repository. **Django paths are relative to
`grooveshop-django-api/`, a sibling checkout** — a session started here cannot
read them unless that directory was added with `--add-dir`, or you started from
the workspace root. Symptom triage that stays on the Nuxt side works either way.

### Django
| Purpose | File |
|---|---|
| allauth + Knox config | `settings.py` (lines ~230–400, ~892–907) |
| Custom token strategy | `core/api/tokens.py` |
| MFA adapter (WebAuthn RP ID) | `core/adapter.py` |
| Social + account adapter | `user/adapter.py` |
| Password change Knox revoke | `user/signals.py` |
| Rate limiting middleware | `core/middleware/allauth_ratelimit.py` |
| WebSocket token auth | `core/middleware/channels.py` |

### Nuxt
| Purpose | File |
|---|---|
| Header creation + token storage | `server/utils/auth.ts` |
| AllAuth error handling | `server/utils/error.ts` |
| Auth state hooks | `server/utils/hooks.ts` |
| Session GET (token refresh) | `server/api/_allauth/app/v1/auth/session.get.ts` |
| Session DELETE (logout) | `server/api/_allauth/app/v1/auth/session.delete.ts` |
| OAuth Google handler | `server/routes/auth/google.get.ts` |
| OAuth Facebook handler | `server/routes/auth/facebook.get.ts` |
| OAuth params retrieval | `server/api/auth/oauth-params.get.ts` |
| WebSocket token endpoint | `server/api/websocket/user/tokens.get.ts` |
| Startup env validation | `server/plugins/startup-validation.ts` |
| Auth state machine | `app/utils/auth.ts` |
| Auth store (Pinia) | `app/stores/auth.ts` |
| Auth plugin (events) | `app/plugins/auth.ts` |
| Setup plugin (SSR init) | `app/plugins/setup.ts` |
| Auth middleware (route guard) | `app/middleware/auth.global.ts` |
| Session type augmentation | `shared/auth.d.ts` |
| Protected routes list | `shared/constants/index.ts` (AuthenticatedRoutes) |
| Flow → path mapping | `shared/constants/index.ts` (Flow2path) |

## Debugging Workflow

### 1. Identify the symptom

**"Can't log in / 401 on login"**
- Check `server/api/_allauth/app/v1/auth/login.post.ts` — is `getAllAuthHeaders()` called?
- Check Django: is `ACCOUNT_LOGIN_METHODS = {"email"}` set? Only email login works.
- Check if `NUXT_SESSION_PASSWORD` is set and ≥32 chars (startup-validation.ts will throw if not).
- Check Django rate limit: `AllAuthRateLimitMiddleware` blocks after 10 login attempts/min.

**"Session expires / 410 errors"**
- Knox token TTL: 7 days. After expiry Django returns 410.
- `handleAllAuthError` in `server/utils/error.ts` handles 410 by calling `clearUserSession`.
- The auth plugin fires `LOGGED_OUT` → `handleLoggedOut()` → redirect to home.
- Check: is `NUXT_SESSION_PASSWORD` the same across server restarts? Changing it invalidates all sessions.

**"OAuth login broken"**
- Flow: browser → `/auth/google?process=login` → Google → `/auth/google?code=...` → `/account/provider/callback?provider=google&process=login`
- The `oauth_process` cookie carries `process` (login/connect) through the redirect.
- After callback: page calls `GET /api/auth/oauth-params` to get tokens from session, then `POST /api/_allauth/app/v1/auth/provider/token` with the tokens.
- Check: are `NUXT_OAUTH_GOOGLE_CLIENT_ID` / `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` set?
- Check Django: `SOCIALACCOUNT_PROVIDERS.google.APP.client_id` / `.secret` match.

**"2FA / WebAuthn not working"**
- TOTP: `MFA_TOTP_PERIOD=30`, `MFA_TOTP_DIGITS=6` — standard RFC 6238.
- WebAuthn RP ID: set via `APP_MAIN_HOST_NAME` env var in Django. Must match the domain exactly.
- `MFA_WEBAUTHN_ALLOW_INSECURE_ORIGIN = DEBUG` — must be False in production.
- WebAuthn credential creation: `GET /_allauth/app/v1/account/authenticators/webauthn` → `POST`.

**"WebSocket auth fails"**
- WebSocket URL: `wss://api.webside.gr/ws/notifications/?user_id=X&session_token=Y&access_token=Z`
- Tokens fetched from `GET /api/websocket/user/tokens` (requires valid Nuxt session).
- Django: `AllowedHostsOriginValidator` checks `ALLOWED_HOSTS`, then `TokenAuthMiddleware` validates Knox token.
- Knox token must not be expired (7-day TTL). If expired, user needs to re-login.

**"Flow navigation broken (stuck after signup/email verify)"**
- `onAllAuthResponse` fires `auth:change` hook for ALL 200 responses.
- `determineAuthChangeEvent` in `app/utils/auth.ts` maps to `FLOW_UPDATED`.
- `navigateToPendingFlow` reads `Flow2path` from `shared/constants/index.ts`.
- Check: is the flow ID in `ZodFlow.id` enum? Is it in `Flow2path`?

**"Password change doesn't log out other sessions"**
- `ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE = True` (allauth sessions).
- `revoke_knox_tokens_on_password_change` signal (Knox tokens).
- Both should fire. Check `user/signals.py` — is the `password_changed` receiver imported?

### 2. Check allauth response structure

Allauth headless responses follow this pattern:
```json
{
  "status": 200,
  "data": {
    "user": { "id": 1, "email": "...", "has_usable_password": true },
    "methods": [{ "method": "password", "at": 1234567890, "email": "..." }],
    "flows": [{ "id": "verify_email", "is_pending": true }]
  },
  "meta": {
    "is_authenticated": false,
    "session_token": "...",
    "access_token": "..."
  }
}
```

Error responses (401, 410, 403, 404, 409):
```json
{ "status": 401, "data": { ... }, "meta": { "is_authenticated": false, "session_token": "..." } }
```

### 3. Common configuration checks

```bash
# Django — verify auth settings
grep -E "ACCOUNT_|SOCIALACCOUNT_|MFA_|HEADLESS_|REST_KNOX" settings.py

# Nuxt — verify env vars are set
grep "NUXT_SESSION_PASSWORD\|NUXT_SECRET_KEY\|NUXT_OAUTH" .env

# Check allauth rate limit isn't blocking (look for 429s)
# AllAuthRateLimitMiddleware is disabled when DEBUG=True or DISABLE_CACHE=True
```

### 4. Session token flow trace

```
1. User POSTs to /api/_allauth/app/v1/auth/login
2. Nuxt: login.post.ts → getAllAuthHeaders() → $fetch to Django
3. Django: allauth creates session, Knox creates token
4. Django response: { meta: { session_token: "...", access_token: "..." } }
5. Nuxt: processAllAuthSession() → setUserSession() → encrypted cookie
6. Client: onAllAuthResponse() → callAuthChangeHook() → auth:change event
7. Plugin: determineAuthChangeEvent() → LOGGED_IN → handleLoggedIn() → navigate
8. Setup watcher: loggedIn=true → setupSession() + setupAccount() + etc.
```

### 5. Fix checklist

- [ ] `NUXT_SESSION_PASSWORD` ≥ 32 chars and consistent across restarts
- [ ] `NUXT_SECRET_KEY` set (used for X-Encrypted-Token decryption)
- [ ] `APP_MAIN_HOST_NAME` matches production domain (WebAuthn RP ID)
- [ ] `ALLOWED_HOSTS` set in production (not wildcarded)
- [ ] `DEBUG=False` in production (enables SSL, CSRF, CORS restrictions)
- [ ] `MFA_WEBAUTHN_ALLOW_INSECURE_ORIGIN=False` in production
- [ ] OAuth client IDs/secrets match between Django and Nuxt env vars
- [ ] Knox tokens have 7-day TTL — users re-login weekly

## Auth Event State Machine

```
Not logged in
    │
    ├─ login/signup/OAuth ──► LOGGED_IN ──► redirect to /account
    │                              │
    │                              ├─ 401 with is_authenticated ──► REAUTHENTICATION_REQUIRED
    │                              │                                      │
    │                              │                              ──► /account/reauthenticate
    │                              │
    │                              └─ 410 session expired ──► LOGGED_OUT ──► /
    │
    └─ flow pending ──► FLOW_UPDATED ──► navigate to pending flow path
```
