import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import AddForm from '~/components/Account/2Fa/WebAuthn/AddForm.vue'

/**
 * Adding a security key: allauth's creation options go to the browser,
 * the credential comes back under the name given. When the key is the
 * account's first factor allauth also generates recovery codes, and the
 * shopper is sent to see them. Mocked at `useAllAuthAccount`; the
 * browser's WebAuthn API is stubbed.
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

beforeEach(() => {
  getWebAuthnCreateOptions.mockResolvedValue({ status: 200, data: { creation_options: { publicKey: CREATION_OPTIONS } } })
  addWebAuthnCredential.mockResolvedValue(added(false))
  credentialsCreate.mockResolvedValue({ toJSON: () => CREDENTIAL_JSON })
  vi.stubGlobal('PublicKeyCredential', { parseCreationOptionsFromJSON: (json: unknown) => ({ parsed: json }) })
  // A getter spy on happy-dom's `navigator.credentials`: `restoreMocks`
  // puts the real one back after every test.
  vi.spyOn(window.navigator, 'credentials', 'get').mockReturnValue({ create: credentialsCreate } as Partial<CredentialsContainer> as CredentialsContainer)
})

async function submit(wrapper: VueWrapper, name: string, passwordless = false) {
  await wrapper.find('input[autocomplete="name"]').setValue(name)
  if (passwordless) await wrapper.find('button[role="checkbox"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

const mountForm = () => mountSuspended(AddForm, { route: false })

describe('Account/2Fa/WebAuthn/AddForm', () => {
  it.each([false, true])('registers the key (passwordless: %s) under its name', async (passwordless) => {
    const wrapper = await mountForm()

    await submit(wrapper, 'YubiKey', passwordless)

    expect(getWebAuthnCreateOptions).toHaveBeenCalledWith(passwordless)
    expect(credentialsCreate).toHaveBeenCalledWith({ publicKey: { parsed: CREATION_OPTIONS } })
    expect(addWebAuthnCredential).toHaveBeenCalledWith({ name: 'YubiKey', credential: CREDENTIAL_JSON })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('addWebAuthnCredential')).toHaveLength(1)
  })

  it.each([
    [false, 'account-2fa-webauthn'],
    [true, 'account-2fa-recovery-codes'],
  ] as const)('with recovery codes generated: %s, goes on to %s', async (generated, route) => {
    addWebAuthnCredential.mockResolvedValue(added(generated))
    const wrapper = await mountForm()

    await submit(wrapper, 'YubiKey')

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()(route))
  })

  it('reports why the key could not be added and stays', async () => {
    credentialsCreate.mockRejectedValue(new Error('The operation either timed out or was not allowed.'))
    const wrapper = await mountForm()

    await submit(wrapper, 'YubiKey')

    expect(toastAdd).toHaveBeenCalledWith({
      title: useNuxtApp().$i18n.t('error.default'),
      description: 'The operation either timed out or was not allowed.',
      color: 'error',
    })
    expect(addWebAuthnCredential).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('does not start without a name', async () => {
    const wrapper = await mountForm()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(getWebAuthnCreateOptions).not.toHaveBeenCalled()
  })
})
