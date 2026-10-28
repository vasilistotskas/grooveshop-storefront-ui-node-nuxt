import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ReauthenticateFlow from '~/components/Account/2Fa/ReauthenticateFlow.vue'
import WebsideReauthenticateFlow from '~/components/variants/webside/Account/2Fa/ReauthenticateFlow.vue'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'
import { makeSessionResponse } from '~~/test/fixtures/allauth'

/**
 * The frame of a re-authentication step (a sensitive account change):
 * the OTHER ways allauth offers to confirm it is you — the password,
 * then each second factor strongest first — the page on screen being
 * the one left out (`useMfaReauthenticationMethods`, shared by both trees).
 * The webside design lists every way, the page on screen included and marked
 * as the current one. Driven by the `auth-state` the auth plugin keeps.
 *
 * Re-authentication confirms a shopper who is already signed in, and its
 * routes are behind sign-in (`auth.global`), so the shopper here is
 * signed in. The whole session surface: the app's auth plugins call it
 * while booting.
 */
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

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

const COPY = inlineCopy('app/components/variants/webside/Account/2Fa/ReauthenticateFlow.vue')

const methods = (wrapper: VueWrapper) => wrapper.findAll('a[href]').map(method => method.text())

describe.each(trees(ReauthenticateFlow, WebsideReauthenticateFlow))('$tree Account/2Fa/ReauthenticateFlow', ({ tree, C }) => {
  const mountFlow = () => mountSuspended(C, {
    route: '/account/2fa/reauthenticate/totp?next=/account/settings',
  })

  it.runIf(tree === 'default')('offers the password, then each other factor strongest first', async () => {
    const wrapper = await mountFlow()

    // The authenticator app is this page, so it is not offered.
    expect(methods(wrapper)).toEqual([
      'Χρησιμοποίησε τον κωδικό σου',
      'Χρησιμοποίησε passkey ή κλειδί ασφαλείας',
      'Χρησιμοποίησε κωδικό ανάκτησης',
    ])
  })

  it.runIf(tree === 'webside')('lists the password, then each factor strongest first, marking this page', async () => {
    const wrapper = await mountFlow()

    const text = wrapper.text()
    const order = [COPY.reauthenticate.title, COPY.mfa_reauthenticate.webauthn, COPY.mfa_reauthenticate.totp, COPY.mfa_reauthenticate.recovery_codes]
    expect(order.map(label => text.indexOf(label))).toEqual([...order.map(label => text.indexOf(label))].sort((a, b) => a - b))
    expect(order.every(label => text.includes(label))).toBe(true)
    expect(text).toContain(COPY.current_method)
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
    expect(wrapper.findAll('a[href]')).toHaveLength(0)
  })
})
