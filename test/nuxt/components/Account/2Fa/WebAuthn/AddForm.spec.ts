import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import AddForm from '~/components/Account/2Fa/WebAuthn/AddForm.vue'
import { asProxiedError, makeAllAuthConfig, makeBadResponse } from '~~/test/fixtures/allauth'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * Adding a passkey or security key: allauth's creation options go to the
 * browser, the credential comes back under the name given. "Sign in
 * without a password" is offered only where the store lets passkeys sign
 * in. When the key is the account's first factor allauth also generates
 * recovery codes, and the shopper is sent to see them; otherwise back to
 * the passkeys on Security. Failures are said in the shopper's language.
 * Mocked at `useAllAuthAccount`; the browser's WebAuthn API is stubbed.
 */
const { getWebAuthnCreateOptions, addWebAuthnCredential, navigateToMock, toastAdd, credentialsCreate } = vi.hoisted(() => ({
  getWebAuthnCreateOptions: vi.fn(),
  addWebAuthnCredential: vi.fn(),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
  credentialsCreate: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ getWebAuthnCreateOptions, addWebAuthnCredential }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const CREATION_OPTIONS = { challenge: 'Y2hhbGxlbmdl', rp: { id: 'test.local' } }
const CREDENTIAL_JSON = { id: 'cred-1', type: 'public-key' }
const added = (recoveryCodesGenerated: boolean) => ({ status: 200, data: {}, meta: { recovery_codes_generated: recoveryCodesGenerated } })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Account/2Fa/WebAuthn/AddForm.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

function allowPasskeyLogin(allowed: boolean) {
  useAuthStore().config = makeAllAuthConfig({ mfa: { supported_types: ['totp', 'recovery_codes', 'webauthn'], passkey_login_enabled: allowed } }).data
}

beforeEach(() => {
  allowPasskeyLogin(true)
  getWebAuthnCreateOptions.mockResolvedValue({ status: 200, data: { creation_options: { publicKey: CREATION_OPTIONS } } })
  addWebAuthnCredential.mockResolvedValue(added(false))
  credentialsCreate.mockResolvedValue({ toJSON: () => CREDENTIAL_JSON })
  vi.stubGlobal('PublicKeyCredential', { parseCreationOptionsFromJSON: (json: unknown) => ({ parsed: json }) })
  // A getter spy on happy-dom's `navigator.credentials`: `restoreMocks`
  // puts the real one back after every test.
  vi.spyOn(window.navigator, 'credentials', 'get').mockReturnValue({ create: credentialsCreate } as Partial<CredentialsContainer> as CredentialsContainer)
})

async function submit(wrapper: VueWrapper, name: string, passwordless = false) {
  await wrapper.find('input').setValue(name)
  if (passwordless) await wrapper.get('button[role="switch"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

const mountForm = () => mountSuspended(AddForm, { route: false })

describe('Account/2Fa/WebAuthn/AddForm', () => {
  it.each([false, true])('registers the key (passwordless: %s) under its name', async (passwordless) => {
    const wrapper = await mountForm()

    await submit(wrapper, '  YubiKey  ', passwordless)

    expect(getWebAuthnCreateOptions).toHaveBeenCalledExactlyOnceWith(passwordless)
    expect(credentialsCreate).toHaveBeenCalledWith({ publicKey: { parsed: CREATION_OPTIONS } })
    expect(addWebAuthnCredential).toHaveBeenCalledExactlyOnceWith({ name: 'YubiKey', credential: CREDENTIAL_JSON })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: messages.added, color: 'success' })
  })

  it('offers no passwordless key where passkeys cannot sign in', async () => {
    allowPasskeyLogin(false)
    const wrapper = await mountForm()

    expect(wrapper.find('button[role="switch"]').exists()).toBe(false)
    await submit(wrapper, 'YubiKey')

    expect(getWebAuthnCreateOptions).toHaveBeenCalledExactlyOnceWith(false)
  })

  it.each([
    [false, '/account/security#passkeys'],
    [true, '/account/2fa/recovery-codes'],
  ] as const)('with recovery codes generated: %s, goes on to %s', async (generated, path) => {
    addWebAuthnCredential.mockResolvedValue(added(generated))
    const wrapper = await mountForm()

    await submit(wrapper, 'YubiKey')

    expect(navigateToMock).toHaveBeenCalledExactlyOnceWith(path)
  })

  it.each([
    ['cancelled or timed out', new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError'), 'cancelled'],
    ['already registered', new DOMException('The authenticator was previously registered.', 'InvalidStateError'), 'registered'],
    ['anything else', new Error('boom'), 'other'],
  ] as const)('says the key was not added when the browser step fails (%s), and stays', async (_case, error, key) => {
    credentialsCreate.mockRejectedValue(error)
    const wrapper = await mountForm()

    await submit(wrapper, 'YubiKey')

    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: messages.failed[key], color: 'error' })
    expect(addWebAuthnCredential).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('says what allauth refused, by its code', async () => {
    addWebAuthnCredential.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'incorrect_code', param: 'credential', message: 'Incorrect code.' })))
    const wrapper = await mountForm()

    await submit(wrapper, 'YubiKey')

    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ title: messages.failed.other }))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not start without a name', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, '   ')

    expect(getWebAuthnCreateOptions).not.toHaveBeenCalled()
  })

  it('cancels back to the passkeys on Security', async () => {
    const wrapper = await mountForm()

    expect(wrapper.findAll('a').find(link => link.text() === messages.cancel)!.attributes('href')).toBe('/account/security#passkeys')
  })
})
