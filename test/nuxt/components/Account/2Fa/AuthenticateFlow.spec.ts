import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import AuthenticateFlow from '~/components/Account/2Fa/AuthenticateFlow.vue'
import WebsideAuthenticateFlow from '~/components/variants/webside/Account/2Fa/AuthenticateFlow.vue'
import { trees } from '~~/test/helpers/trees'
import { makePendingFlowResponse } from '~~/test/fixtures/allauth'
import type { Flow } from '~~/shared/types/model/all-auth'

/**
 * The frame of every second-factor sign-in step: it offers the shopper's
 * OTHER enrolled factors, strongest first, each keeping `next`. The two
 * trees share their `<script>`.
 */
const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const pendingMfa = (types: Flow['types']) => makePendingFlowResponse('mfa_authenticate', { types })

beforeEach(() => {
  useState('auth-state').value = pendingMfa(['recovery_codes', 'totp', 'webauthn'])
})

/** The factors the shopper can switch to. */
const alternatives = (wrapper: VueWrapper) =>
  wrapper.findAll('a[href]').map(link => [link.text(), link.attributes('href')])

describe.each(trees(AuthenticateFlow, WebsideAuthenticateFlow))('$tree Account/2Fa/AuthenticateFlow', ({ C }) => {
  const mountFlow = () => mountSuspended(C, {
    props: { authenticatorType: 'totp' },
    route: '/account/2fa/authenticate/totp?next=/account/orders',
  })

  it('offers the other factors, strongest first, each keeping `next`', async () => {
    const wrapper = await mountFlow()
    const localePath = useLocalePath()
    const href = (name: FlowPathValue) => localePath({ name, query: { next: '/account/orders' } })

    expect(alternatives(wrapper)).toEqual([
      ['Χρησιμοποίησε το κλειδί ασφαλείας', href('account-2fa-authenticate-webauthn')],
      ['Χρησιμοποίησε κωδικούς ανάκτησης', href('account-2fa-authenticate-recovery-codes')],
    ])
  })

  it('does not offer the factor already in use as an alternative', async () => {
    // The filter compared a route NAME with the current PATH, which never
    // match: the factor in use was listed as a dead, disabled option.
    const wrapper = await mountFlow()

    expect(wrapper.text()).not.toContain('Χρησιμοποίησε την εφαρμογή πολλαπλών παραγόντων')
    expect(wrapper.findAll('[disabled]')).toHaveLength(0)
  })

  it('offers no alternatives to a shopper with one factor', async () => {
    useState('auth-state').value = pendingMfa(['totp'])

    const wrapper = await mountFlow()

    expect(wrapper.findAll('a[href]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Εναλλακτικές επιλογές')
  })

  it('sends a visitor with no second factor pending home', async () => {
    useState('auth-state').value = undefined

    await mountFlow()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
