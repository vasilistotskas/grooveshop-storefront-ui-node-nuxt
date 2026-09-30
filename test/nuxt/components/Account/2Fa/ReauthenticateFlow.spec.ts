import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ReauthenticateFlow from '~/components/Account/2Fa/ReauthenticateFlow.vue'
import { makeSessionResponse } from '~~/test/fixtures/allauth'

/**
 * The frame of a re-authentication step (a sensitive account change):
 * every way allauth offers to confirm it is you — the password, then
 * each second factor strongest first — with the current one marked.
 * Driven by the `auth-state` the auth plugin keeps.
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

const methods = (wrapper: VueWrapper) =>
  wrapper.findAll('a, [aria-disabled="true"]').map(method => method.find('p').text())

describe('Account/2Fa/ReauthenticateFlow', () => {
  it('offers the password, then each factor strongest first', async () => {
    const wrapper = await mountFlow()

    expect(methods(wrapper)).toEqual([
      'Κωδικός πρόσβασης',
      'Κλειδί ασφαλείας',
      'Εφαρμογή επαλήθευσης',
      'Κωδικοί ανάκτησης',
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

  it('marks the method of the current page', async () => {
    const wrapper = await mountFlow()

    const current = wrapper.findAll('a, [aria-disabled="true"]').filter(method => method.text().includes('Τρέχουσα'))
    expect(current.map(method => method.find('p').text())).toEqual(['Εφαρμογή επαλήθευσης'])
  })

  it('offers nothing without a re-authentication flow', async () => {
    useState('auth-state').value = makeSessionResponse()

    const wrapper = await mountFlow()

    expect(wrapper.text()).not.toContain('Εναλλακτικές μέθοδοι')
  })
})
