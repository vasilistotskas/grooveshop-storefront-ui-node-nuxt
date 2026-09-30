import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { handleAllAuthClientError } from '~/utils/error'

/**
 * What a shopper is told when an allauth request fails.
 *
 * Every rejection has to stay readable: an unmapped code used to render
 * the literal i18n key ("validation.api.password_too_common"), so a
 * code without a translation falls back to allauth's own message, and a
 * message-less one to the generic error. A rate limit is its own toast,
 * and a 401 whose pending flows name the next step says that step
 * rather than "not authenticated".
 *
 * Asserted on the toasts, which are the whole user-facing output; the
 * copy is compared through `$i18n.t` rather than hardcoded.
 */
const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/** A `$fetch` rejection: Nitro's wrapper at `data`, allauth's body under it. */
const thrown = (body: unknown) => ({ data: { statusCode: 400, data: body } })

const toasts = () => toastAdd.mock.calls.map(([toast]) => toast)

describe('handleAllAuthClientError', () => {
  it('says the shopper is going too fast on a rate limit, and nothing else', () => {
    handleAllAuthClientError({ data: { statusCode: 429, data: { status: 400, errors: [{ code: 'invalid_login', message: 'm' }] } } })

    expect(toasts()).toEqual([{ title: useNuxtApp().$i18n.t('error.rate_limited'), color: 'warning' }])
  })

  it('translates each field error it has copy for, and falls back to allauth\'s message, then to the generic one', () => {
    const { t } = useNuxtApp().$i18n

    handleAllAuthClientError(thrown({
      status: 400,
      errors: [
        { code: 'invalid_login', message: 'Incorrect.' },
        { code: 'not_translated_here', message: 'This password is entirely numeric.' },
        { code: 'never_heard_of', message: '' },
      ],
    }))

    expect(toasts()).toEqual([
      { title: t('validation.api.invalid_login'), color: 'error' },
      { title: 'This password is entirely numeric.', color: 'error' },
      { title: t('unknown.error'), color: 'error' },
    ])
  })

  it('says "not authenticated" for a 401 with no pending step', () => {
    handleAllAuthClientError(thrown({ status: 401, data: { flows: [{ id: 'login' }] }, meta: { is_authenticated: false } }))

    expect(toasts()).toEqual([{ title: useNuxtApp().$i18n.t('auth.error.not_authenticated'), color: 'error' }])
  })

  it.each([
    ['verify_email', 'auth.error.verify_email', 'error'],
    ['mfa_authenticate', 'auth.error.mfa_authenticate', 'warning'],
  ])('names the pending %s step instead', (flow, key, color) => {
    handleAllAuthClientError(thrown({ status: 401, data: { flows: [{ id: flow, is_pending: true }] }, meta: { is_authenticated: false } }))

    expect(toasts()).toEqual([{ title: useNuxtApp().$i18n.t(key), color }])
  })

  it.each([
    ['an expired session (410)', { status: 410, data: { flows: [] }, meta: { is_authenticated: false } }],
    ['a forbidden answer (403)', { status: 403 }],
    ['a conflict (409)', { status: 409 }],
  ])('shows nothing of its own for %s', (_case, body) => {
    // The auth:change pipeline and the calling form own these; a toast
    // here would be a second message for one event.
    handleAllAuthClientError(thrown(body))

    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('ignores an error that is not allauth\'s', () => {
    handleAllAuthClientError(new Error('network down'))

    expect(toastAdd).not.toHaveBeenCalled()
  })
})
