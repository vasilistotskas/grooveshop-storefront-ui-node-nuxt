import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Security from '~/components/Storefront/Account/Security.vue'
import type { Authenticator } from '~~/shared/types/model/all-auth/account/authenticators/authenticators'
import { makeAllAuthConfig, makeAuthenticator, makeSessionResponse } from '~~/test/fixtures/allauth'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The account's Security page: two-step verification summed up over its
 * tiles, the passkeys, the password, then the email, device and
 * connected-account sections. The second factors are read before it
 * renders, and a failed read says so instead of "Off". Each manager has
 * its own spec; here they are stand-ins that only prove they are placed.
 */
const { getAuthenticators } = vi.hoisted(() => ({
  getAuthenticators: vi.fn((): Promise<{ status: 200, data: Authenticator[] } | undefined> => Promise.resolve(undefined)),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ getAuthenticators }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockComponent('AccountSecurityTwoStep', { template: '<div data-stub="two-step" />' })
mockComponent('Account2FaWebAuthnList', { template: '<div data-stub="passkeys" />' })
mockComponent('AccountEmailManage', { template: '<div data-stub="emails" />' })
mockComponent('AccountSessionsManage', { template: '<div data-stub="sessions" />' })
mockComponent('AccountProvidersManage', { template: '<div data-stub="providers" />' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/Account/Security.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

function given({ factors = [] as Authenticator[], supported = ['totp', 'recovery_codes', 'webauthn'] as Array<'totp' | 'webauthn' | 'recovery_codes'>, password = true } = {}) {
  const store = useAuthStore()
  store.config = makeAllAuthConfig({ mfa: { supported_types: supported, passkey_login_enabled: true } }).data
  store.session = makeSessionResponse({ user: { has_usable_password: password } }).data
  store.authenticators = undefined
  getAuthenticators.mockResolvedValue({ status: 200, data: factors })
}

beforeEach(() => {
  given()
})

const mountPage = () => mountSuspended(Security, { route: false })
const stubs = (wrapper: VueWrapper) => wrapper.findAll('[data-stub]').map(stub => stub.attributes('data-stub'))
const section = (wrapper: VueWrapper, title: string) =>
  wrapper.findAll('section').find(candidate => candidate.get('h2').text() === title)!

describe('Storefront/Account/Security', () => {
  it('reads the second factors first, then places every section in the board\'s order', async () => {
    const wrapper = await mountPage()

    expect(getAuthenticators).toHaveBeenCalledOnce()
    expect(wrapper.get('h1').text()).toBe(messages.title)
    expect(stubs(wrapper)).toEqual(['two-step', 'passkeys', 'emails', 'sessions', 'providers'])
    expect(wrapper.findAll('h2').map(heading => heading.text())).toEqual([messages.two_step.title, messages.password.title])
  })

  it('gives each section the id a link jumps to', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('#two-step').get('h2').text()).toBe(messages.two_step.title)
    expect(wrapper.get('#password').get('h2').text()).toBe(messages.password.title)
    expect(['passkeys', 'emails', 'devices', 'connected-accounts'].map(id => wrapper.get(`#${id}`).attributes('data-stub')))
      .toEqual(['passkeys', 'emails', 'sessions', 'providers'])
  })

  it('sums two-step verification up as off when no factor is on', async () => {
    const wrapper = await mountPage()

    expect(section(wrapper, messages.two_step.title).get('h2 + p').text()).toBe(messages.two_step.off)
  })

  it('names the factors that are on, as a list in the page language', async () => {
    given({ factors: [makeAuthenticator('totp'), makeAuthenticator('webauthn'), makeAuthenticator('recovery_codes')] })

    const wrapper = await mountPage()

    expect(section(wrapper, messages.two_step.title).get('h2 + p').text()).toBe('Ενεργή · εφαρμογή επαλήθευσης και passkeys')
  })

  it('says two-step verification could not be read instead of reporting it off, and reads it again on retry', async () => {
    getAuthenticators.mockRejectedValue(new Error('502'))

    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain(messages.two_step.load_error)
    expect(stubs(wrapper)).not.toContain('two-step')

    getAuthenticators.mockResolvedValue({ status: 200, data: [makeAuthenticator('totp')] })
    await wrapper.get('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(stubs(wrapper)).toContain('two-step'))
  })

  it('leaves passkeys out on a store that does not support them', async () => {
    given({ supported: ['totp', 'recovery_codes'] })

    const wrapper = await mountPage()

    expect(stubs(wrapper)).not.toContain('passkeys')
    expect(stubs(wrapper)).toContain('two-step')
  })

  it('leaves two-step verification out on a store without it', async () => {
    given({ supported: [] })

    const wrapper = await mountPage()

    expect(stubs(wrapper)).toEqual(['emails', 'sessions', 'providers'])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('offers to change the password the shopper has', async () => {
    const wrapper = await mountPage()

    const password = section(wrapper, messages.password.title)
    expect(password.text()).toContain(messages.password.set)
    expect(password.get('a').text()).toBe(messages.password.change)
    expect(password.get('a').attributes('href')).toBe('/account/password/change')
  })

  it('offers to set a password to a shopper who signs in without one', async () => {
    given({ password: false })

    const wrapper = await mountPage()

    const password = section(wrapper, messages.password.title)
    expect(password.text()).toContain(messages.password.unset)
    expect(password.get('a').text()).toBe(messages.password.create)
  })
})
