import { describe, it, expect, afterEach } from 'vitest'

/**
 * `authInfo()`'s branches are unit-tested in test/unit/app/utils/auth.spec.ts.
 * What this pins is the wiring: the composable follows the `auth-state`
 * the auth plugin writes, and hands back plain values, not refs.
 */
describe('useAuthInfo', () => {
  const authState = () => useState<AllAuthResponse | AllAuthResponseError>('auth-state')
  let previous: AllAuthResponse | AllAuthResponseError

  afterEach(() => {
    authState().value = previous
  })

  it('follows the auth state as the auth plugin updates it', () => {
    previous = authState().value
    const info = useAuthInfo()
    const user = { id: 7, email: 'shopper@example.com' }

    authState().value = {
      status: 200,
      data: { user, methods: [{ method: 'password', at: 1_700_000_000 }] },
      meta: { is_authenticated: true },
    }
    expect({ ...info }).toEqual({ isAuthenticated: true, requiresReauthentication: false, user, pendingFlow: null })

    const flow = { id: 'mfa_authenticate' as const, is_pending: true }
    authState().value = {
      status: 401,
      data: { flows: [flow] },
      meta: { is_authenticated: false },
    } as AllAuthResponseError
    expect({ ...info }).toEqual({ isAuthenticated: false, requiresReauthentication: false, user: null, pendingFlow: flow })
  })
})
