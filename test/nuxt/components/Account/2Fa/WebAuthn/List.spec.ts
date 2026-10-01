import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import List from '~/components/Account/2Fa/WebAuthn/List.vue'
import type { Authenticator } from '~~/shared/types/model/all-auth/account/authenticators/authenticators'

/**
 * The account's security keys, renamed and removed optimistically: the
 * table changes at once and goes back if allauth refuses. Mocked at
 * `useAllAuthAccount`; the keys come from the auth store.
 */
// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const { deleteWebAuthnCredential, updateWebAuthnCredential, getAuthenticators, navigateToMock, toastAdd } = vi.hoisted(() => ({
  deleteWebAuthnCredential: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  updateWebAuthnCredential: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  getAuthenticators: vi.fn(),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ deleteWebAuthnCredential, updateWebAuthnCredential, getAuthenticators }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const key = (id: number, name: string, extra: Partial<Authenticator> = {}): Authenticator => ({
  id, type: 'webauthn', name, created_at: 1767225600, last_used_at: null, is_passwordless: false, ...extra,
})
const TOTP: Authenticator = { type: 'totp', created_at: 1767225600, last_used_at: null }

beforeEach(() => {
  useAuthStore().authenticators = [
    key(1, 'YubiKey', { is_passwordless: true }),
    key(2, 'Laptop', { last_used_at: 1767312000 }),
    TOTP,
  ]
})

const mountList = () => mountSuspended(List, { route: false })
const names = (wrapper: VueWrapper) =>
  wrapper.findAll('tbody tr').map(row => row.find<HTMLInputElement>('input').element.value)
/** The row's menu items, as `List.vue` hands them to its UDropdownMenu (Reka teleports the open menu). */
const menu = (wrapper: VueWrapper, row: number) =>
  wrapper.findAllComponents({ name: 'UDropdownMenu' })[row]!.props('items')[0] as Array<{ onSelect: () => unknown }>

describe('Account/2Fa/WebAuthn/List', () => {
  it('says there is no key yet, and how to add one', async () => {
    useAuthStore().authenticators = [TOTP]

    const wrapper = await mountList()

    // Nuxt UI v4's table takes its empty state through the `#empty` slot;
    // an `empty-state` object fell through as an attribute and the shopper
    // read the generic "no data" instead.
    expect(wrapper.text()).toContain('Δεν υπάρχουν κλειδιά ασφαλείας')
    expect(wrapper.text()).toContain('Πρόσθεσε ένα κλειδί ασφαλείας για να ξεκινήσεις')
    expect(wrapper.text()).not.toContain('empty.title')
  })

  it('lists only the security keys, marking the passwordless one and the unused one', async () => {
    const wrapper = await mountList()
    const rows = wrapper.findAll('tbody tr')

    expect(names(wrapper)).toEqual(['YubiKey', 'Laptop'])
    expect(rows[0]!.text()).toContain('Χωρίς κωδικό')
    expect(rows[1]!.text()).not.toContain('Χωρίς κωδικό')
    expect(rows[0]!.text()).toContain('Αχρησιμοποίητο')
    expect(rows[1]!.text()).not.toContain('Αχρησιμοποίητο')
  })

  it('removes a key at once and asks allauth to delete it', async () => {
    const wrapper = await mountList()

    await menu(wrapper, 0)[1]!.onSelect()
    await flushPromises()

    expect(deleteWebAuthnCredential).toHaveBeenCalledWith({ authenticators: [1] })
    expect(names(wrapper)).toEqual(['Laptop'])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('puts the key back when allauth refuses to delete it', async () => {
    deleteWebAuthnCredential.mockResolvedValue({ status: 400 })
    const wrapper = await mountList()

    await menu(wrapper, 0)[1]!.onSelect()
    await flushPromises()

    expect(names(wrapper)).toEqual(['YubiKey', 'Laptop'])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it('renames a key once edited and saved', async () => {
    const wrapper = await mountList()
    const nameInput = () => wrapper.findAll('tbody tr')[1]!.find('input')
    expect(nameInput().attributes('disabled')).toBeDefined()

    await menu(wrapper, 1)[0]!.onSelect()
    await flushPromises()
    await nameInput().setValue('Γραφείο')
    await wrapper.findAll('tbody tr')[1]!.find('button').trigger('click')
    await flushPromises()

    expect(updateWebAuthnCredential).toHaveBeenCalledWith({ id: 2, name: 'Γραφείο' })
    expect(names(wrapper)).toContain('Γραφείο')
  })

  it('goes back to the two-factor overview when no key is left', async () => {
    useAuthStore().authenticators = [TOTP]

    await mountList()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-2fa'))
  })
})
