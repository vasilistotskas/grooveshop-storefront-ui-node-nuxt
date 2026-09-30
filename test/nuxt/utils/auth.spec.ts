import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { FetchResponse } from 'ofetch'
import {
  SYNTHETIC_EXPIRED_SESSION,
  navigateToPendingFlow,
  onAllAuthResponse,
  onAllAuthResponseError,
  tryAdvanceToPendingFlow,
} from '~/utils/auth'
import { asProxiedError, makePendingFlowResponse } from '~~/test/fixtures/allauth'

/**
 * The half of `app/utils/auth.ts` that talks to the Nuxt app: it fires
 * the `auth:change` hook every store and the auth plugin listen on, and
 * it navigates. The pure half is `test/unit/app/utils/auth.spec.ts`.
 *
 * `callHook` is spied (and answered) rather than letting the real
 * listeners run, because what these helpers own is WHICH payload reaches
 * the pipeline — what the listeners do with it is the auth plugin's.
 */
const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const response = (status: number, data: unknown) =>
  ({ status, _data: data }) as unknown as FetchResponse<any>

let callHook: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
  callHook = vi.spyOn(useNuxtApp(), 'callHook').mockResolvedValue(undefined as never)
  await useRouter().push('/')
})

describe('onAllAuthResponse', () => {
  it('forwards a response that carries auth state', async () => {
    const body = { status: 200, meta: { is_authenticated: true }, data: { user: { id: 1 } } }

    await onAllAuthResponse(response(200, body), { explicit: true })

    expect(callHook).toHaveBeenCalledWith('auth:change', { detail: body, explicit: true })
  })

  it.each([
    // The TOTP setup endpoint answers `meta: { secret, totp_svg }`; read
    // as auth state it would say "not authenticated" and log the user out.
    ['a 200 whose meta is not auth state', response(200, { status: 200, meta: { secret: 's' }, data: {} })],
    ['a non-200 response', response(401, { status: 401, meta: { is_authenticated: false }, data: {} })],
    ['a response with no body', response(200, undefined)],
  ])('ignores %s', async (_case, res) => {
    await onAllAuthResponse(res)

    expect(callHook).not.toHaveBeenCalledWith('auth:change', expect.anything())
  })
})

describe('onAllAuthResponseError', () => {
  it.each([401, 410])('forwards the allauth payload of a %i', async (status) => {
    const payload = { status, meta: { is_authenticated: false }, data: { flows: [] } }

    await onAllAuthResponseError(response(status, { statusCode: status, data: payload }))

    expect(callHook).toHaveBeenCalledWith('auth:change', { detail: payload })
  })

  it('turns a 410 that lost its payload into the synthetic expiry', async () => {
    // The production error handler strips thrown-route bodies; a 410 is
    // unambiguous without one, and a silent mid-page expiry left stores
    // stale and the shopper on a page that 401s.
    await onAllAuthResponseError(response(410, { statusCode: 410 }), { explicit: false })

    expect(callHook).toHaveBeenCalledWith('auth:change', { detail: SYNTHETIC_EXPIRED_SESSION, explicit: false })
  })

  it.each([
    // The deliberate "not signed in" throw of an anonymous flow: firing
    // LOGGED_OUT there would toast every anonymous visitor.
    ['a 401 without a payload', response(401, { statusCode: 401 })],
    ['a status that says nothing about the session', response(403, { statusCode: 403, data: { status: 403 } })],
    ['an error with no body', response(410, undefined)],
  ])('stays silent for %s', async (_case, res) => {
    await onAllAuthResponseError(res)

    expect(callHook).not.toHaveBeenCalledWith('auth:change', expect.anything())
  })
})

describe('navigateToPendingFlow', () => {
  it('goes to the pending flow\'s page, carrying a safe `next`', async () => {
    await useRouter().push('/account/login?next=/account/orders')

    await navigateToPendingFlow(makePendingFlowResponse('verify_email'))

    expect(navigateToMock).toHaveBeenCalledWith(`${useLocalePath()('account-verify-email')}?next=%2Faccount%2Forders`)
  })

  it('drops a `next` that would leave the site', async () => {
    await useRouter().push('/account/login?next=//evil.test')

    await navigateToPendingFlow(makePendingFlowResponse('verify_email'))

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-verify-email'))
  })

  it('stays put without a pending flow', async () => {
    await navigateToPendingFlow({ status: 401, meta: { is_authenticated: false }, data: { flows: [] } } as never)

    expect(navigateToMock).not.toHaveBeenCalled()
  })
})

describe('tryAdvanceToPendingFlow', () => {
  it('advances to a pending flow on a different route, keeping a safe `next`', async () => {
    await useRouter().push('/account/login?next=/cart')

    expect(await tryAdvanceToPendingFlow(asProxiedError(makePendingFlowResponse('login_by_code')))).toBe(true)
    expect(navigateToMock).toHaveBeenCalledWith({
      path: useLocalePath()('account-login-code-confirm'),
      query: { next: '/cart' },
    })
  })

  it('drops a `next` that would leave the site', async () => {
    await useRouter().push('/account/login?next=https://evil.test')

    await tryAdvanceToPendingFlow(asProxiedError(makePendingFlowResponse('login_by_code')))

    expect(navigateToMock).toHaveBeenCalledWith({ path: useLocalePath()('account-login-code-confirm'), query: undefined })
  })

  it('does NOT advance when the pending flow maps back to the submitting form (wrong-code retry)', async () => {
    const webauthn = useLocalePath()('account-2fa-authenticate-webauthn')

    const advanced = await tryAdvanceToPendingFlow(asProxiedError(makePendingFlowResponse('mfa_authenticate', { types: ['webauthn'] })), { fromPath: webauthn })

    expect(advanced).toBe(false)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('treats it as an advance, without navigating again, when the auth:change hook already landed on the flow page', async () => {
    // ofetch awaits onResponseError before rejecting, so by the time a
    // form's catch runs the global hook has often navigated already.
    const webauthn = useLocalePath()('account-2fa-authenticate-webauthn')
    await useRouter().push(webauthn)

    const advanced = await tryAdvanceToPendingFlow(asProxiedError(makePendingFlowResponse('mfa_authenticate', { types: ['webauthn'] })), { fromPath: useLocalePath()('account-login') })

    expect(advanced).toBe(true)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not advance for an error that is not a pending flow', async () => {
    expect(await tryAdvanceToPendingFlow(new Error('boom'))).toBe(false)
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
