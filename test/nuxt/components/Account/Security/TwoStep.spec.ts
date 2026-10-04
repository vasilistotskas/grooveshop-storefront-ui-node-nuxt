import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import TwoStep from '~/components/Account/Security/TwoStep.vue'
import type { Authenticator } from '~~/shared/types/model/all-auth/account/authenticators/authenticators'
import { makeAllAuthConfig, makeAuthenticator } from '~~/test/fixtures/allauth'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * Two-step verification at a glance: a tile per second factor the store
 * supports — authenticator app, passkeys, recovery codes — saying
 * whether it is on, with the one action that changes it. Recovery codes
 * exist only beside another factor, so their tile waits for one. Reads
 * the real auth store.
 */
const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Account/Security/TwoStep.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

function given(authenticators: Authenticator[], supported: Array<'totp' | 'webauthn' | 'recovery_codes'> = ['totp', 'recovery_codes', 'webauthn']) {
  const store = useAuthStore()
  store.config = makeAllAuthConfig({ mfa: { supported_types: supported, passkey_login_enabled: true } }).data
  store.authenticators = authenticators
}

beforeEach(() => {
  given([])
})

const mountTiles = () => mountSuspended(TwoStep, { route: false })
const tile = (wrapper: VueWrapper, title: string) => wrapper.findAll('li').find(item => item.text().includes(title))
const action = (wrapper: VueWrapper, title: string) => {
  const link = tile(wrapper, title)!.find('a')
  return { label: link.text(), href: link.attributes('href') }
}

describe('Account/Security/TwoStep', () => {
  it('offers to set up the authenticator app and add a passkey when neither is on', async () => {
    const wrapper = await mountTiles()

    expect(tile(wrapper, messages.totp.title)!.text()).toContain(messages.off)
    expect(action(wrapper, messages.totp.title)).toEqual({ label: messages.totp.set_up, href: '/account/2fa/totp/activate' })
    expect(tile(wrapper, messages.webauthn.title)!.text()).toContain('Κανένα ακόμα')
    expect(action(wrapper, messages.webauthn.title)).toEqual({ label: messages.webauthn.add, href: '/account/2fa/webauthn/add' })
  })

  it('shows the app on since it was added, with turning it off', async () => {
    given([makeAuthenticator('totp')])

    const wrapper = await mountTiles()

    expect(tile(wrapper, messages.totp.title)!.text()).toContain(messages.on)
    expect(tile(wrapper, messages.totp.title)!.text()).toContain('Ενεργή από Ιαν 2026')
    expect(action(wrapper, messages.totp.title)).toEqual({ label: messages.totp.turn_off, href: '/account/2fa/totp/deactivate' })
  })

  it('counts the passkeys and offers to manage them', async () => {
    given([makeAuthenticator('webauthn', { id: 1 }), makeAuthenticator('webauthn', { id: 2 })])

    const wrapper = await mountTiles()

    expect(tile(wrapper, messages.webauthn.title)!.text()).toContain('2 καταχωρημένα')
    expect(action(wrapper, messages.webauthn.title)).toEqual({ label: messages.webauthn.manage, href: '/account/security#passkeys' })
  })

  it('shows recovery codes only once another factor is on', async () => {
    const wrapper = await mountTiles()

    expect(tile(wrapper, messages.codes.title)).toBeUndefined()
  })

  it('offers to generate recovery codes beside a factor that has none', async () => {
    given([makeAuthenticator('totp')])

    const wrapper = await mountTiles()

    expect(tile(wrapper, messages.codes.title)!.text()).toContain(messages.codes.none)
    expect(action(wrapper, messages.codes.title)).toEqual({ label: messages.codes.generate, href: '/account/2fa/recovery-codes/generate' })
  })

  it('says how many codes are left, warning when they run low', async () => {
    given([makeAuthenticator('totp'), makeAuthenticator('recovery_codes', { unused_code_count: 3 })])

    const wrapper = await mountTiles()

    expect(tile(wrapper, messages.codes.title)!.text()).toContain('3 από 10 αχρησιμοποίητοι')
    // The tint IS the warning: the badge's colour carries "running low".
    const badge = wrapper.findAllComponents({ name: 'UBadge' }).find(candidate => candidate.text() === 'Απομένουν 3')!
    expect(badge.props('color')).toBe('warning')
    expect(action(wrapper, messages.codes.title)).toEqual({ label: messages.codes.view, href: '/account/2fa/recovery-codes' })
  })

  it('does not warn while plenty of codes are left', async () => {
    given([makeAuthenticator('totp'), makeAuthenticator('recovery_codes', { unused_code_count: 4 })])

    const wrapper = await mountTiles()

    const badge = wrapper.findAllComponents({ name: 'UBadge' }).find(candidate => candidate.text() === 'Απομένουν 4')!
    expect(badge.props('color')).toBe('neutral')
  })

  it('draws only the factors the store supports', async () => {
    given([makeAuthenticator('totp')], ['totp', 'recovery_codes'])

    const wrapper = await mountTiles()

    expect(wrapper.findAll('li').map(item => item.find('p').text())).toEqual([messages.totp.title, messages.codes.title])
  })
})
