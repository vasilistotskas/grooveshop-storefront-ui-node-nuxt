# Security Reviewer

Review code changes for security vulnerabilities specific to this Nuxt 4 SSR e-commerce storefront that proxies requests to a Django REST API backend.

## Focus Areas

### Authentication & Session Management
- **Token handling**: `X-Session-Token` and `Authorization: Bearer` headers must be forwarded correctly via `createHeaders()` in `server/utils/auth.ts`
- **Session clearing**: Use `replaceUserSession()` to fully clear session keys (NOT `setUserSession()` which uses defu merge and silently ignores undefined values)
- **OAuth tokens**: Must be stored in encrypted `session.secure`, never in URL params or client-accessible storage
- **One-time-use endpoints**: OAuth params at `server/api/auth/oauth-params.get.ts` must read-then-clear atomically
- **Access token guards**: Protected routes must use `requireAllAuthAccessToken()` which throws 401 if missing

### Error Handling
- **`handleError()` always throws**: No code after `handleError()` or `handleAllAuthError()` is reachable. If code follows, it's dead code or a potential bypass
- **`createError()` must be thrown**: Using `return createError(...)` sends a 200 response with the error as JSON body — always use `throw createError(...)`
- **AllAuth error recovery**: `handleAllAuthError()` clears sessions on 410 Gone and updates tokens from error metadata. Verify it always calls `handleError()` at end (which throws)

### Input Validation
- **Server routes**: Every route must validate input with `getValidatedQuery()` or `readValidatedBody()` using Zod schemas before proxying to Django
- **Missing validation**: Flag any `$fetch` to Django that uses unvalidated `getQuery()` or `readBody()` directly
- **Zod schema completeness**: Check that response validation via `parseDataAs()` covers all route responses

### Cart Session Security
- **httpOnly cookies**: Cart session cookies must be httpOnly, secure (in production), sameSite lax
- **Cart ID in headers**: `X-Cart-Id` header sent to Django — verify it comes from session, not from client input
- **Session isolation**: Cart data in session must be separate from auth tokens

### XSS Prevention
- **v-html usage**: `vue/no-v-html` is disabled. Audit any `v-html` directives to ensure content is sanitized (use `cleanHtml()` from `app/utils/str.ts` or `shared/utils/html.ts`)
- **User-generated content**: Blog comments, reviews, product descriptions that come from API must be treated as untrusted

### CSRF Protection
- **State-changing operations**: POST/PUT/DELETE routes should include CSRF protection when accessed from browser
- **OAuth flows**: Provider redirect uses form submission — verify CSRF token is included

### WebSocket Security
- **Authentication**: WebSocket at `/ws/notifications/` must include session_token and access_token in URL params
- **Origin verification**: Ensure WebSocket connections validate origin

### Sensitive Data Exposure
- **Console logging**: `server/utils/auth.ts` and `server/utils/error.ts` use `console.info`/`console.error` with session info — verify no tokens are logged
- **Response headers**: `handleAllAuthError()` clears `X-Session-Token` and `Authorization` from response headers — verify this always happens on auth errors
- **Error responses**: Ensure Zod validation errors don't leak internal schema details to clients

## What NOT to Flag
- `vue/no-v-html` being disabled (project convention)
- `no-explicit-any` being off (project convention)
- Using `$fetch` directly in stores (intended pattern — `useFetch` is a composable, not for store actions)
