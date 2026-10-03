import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ReauthenticateFlow from '~/components/Account/2Fa/ReauthenticateFlow.vue'
import { makeSessionResponse } from '~~/test/fixtures/allauth'

/**
 * The frame of a re-authentication step (a sensitive account change):
 * the OTHER ways allauth offers to confirm it is you — the password,
 * then each second factor strongest first — the page on screen being
 * the one left out. Driven by the `auth-state` the auth plugin keeps.
 */
const REAUTH_REQUIRED = {
  status: 401,
  data: {
    flows: [
      { id: 'reauthenticate' },
      { id: 'mfa_reauthenticate', types: ['recovery_codes', 'totp', 'webauthn'] },
    ],
  },
  meta: { is_authenticated: true },
}

beforeEach(() => {
  useState('auth-state').value = REAUTH_REQUIRED
})

const mountFlow = () => mountSuspended(ReauthenticateFlow, {
  route: '/account/2fa/reauthenticate/totp?next=/account/settings',
})

const methods = (wrapper: VueWrapper) => wrapper.findAll('a[href]').map(method => method.text())

describe('Account/2Fa/ReauthenticateFlow', () => {
  it('offers the password, then each other factor strongest first', async () => {
    const wrapper = await mountFlow()

    // The authenticator app is this page, so it is not offered.
    expect(methods(wrapper)).toEqual([
      'Χρησιμοποίησε τον κωδικό σου',
      'Χρησιμοποίησε passkey ή κλειδί ασφαλείας',
      'Χρησιμοποίησε κωδικό ανάκτησης',
    ])
  })

  it('links every other method, keeping `next`', async () => {
    const wrapper = await mountFlow()
    const localePath = useLocalePath()
    const href = (name: FlowPathValue) => localePath({ name, query: { next: '/account/settings' } })

    expect(wrapper.findAll('a[href]').map(link => link.attributes('href'))).toEqual([
      href('account-reauthenticate'),
      href('account-2fa-reauthenticate-webauthn'),
      href('account-2fa-reauthenticate-recovery-codes'),
    ])
  })

  it('offers nothing without a re-authentication flow', async () => {
    useState('auth-state').value = makeSessionResponse()

    const wrapper = await mountFlow()

    expect(wrapper.text()).not.toContain('Εναλλακτικές μέθοδοι')
  })
})
