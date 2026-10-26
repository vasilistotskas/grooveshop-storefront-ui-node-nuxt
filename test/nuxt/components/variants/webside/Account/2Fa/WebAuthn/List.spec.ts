import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockComponent, mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { DropdownMenuItem } from '@nuxt/ui'
import List from '~/components/variants/webside/Account/2Fa/WebAuthn/List.vue'
import type { Authenticator } from '~~/shared/types/model/all-auth/account/authenticators/authenticators'
import { makeAuthenticator } from '~~/test/fixtures/allauth'

/**
 * webside's security keys: renaming one. "Edit" used to enable a
 * borderless input that looked exactly like the plain name, saved only
 * through a small check icon, and had no way back (owner review,
 * 2026-10-16). It now opens a bordered input on a draft, with Save and
 * Cancel; Enter saves, Escape cancels, and the row shows the new name
 * once the API kept it: the change goes through `useWebAuthnKeys`, which
 * reads the keys from allauth again afterwards (the auth store). Webside-only:
 * the frozen tree changes for its own bugs.
 */
const { updateWebAuthnCredential, deleteWebAuthnCredential, getAuthenticators, toastAdd } = vi.hoisted(() => ({
  updateWebAuthnCredential: vi.fn((_body: unknown): Promise<{ status?: number } | undefined> => Promise.resolve({ status: 200 })),
  deleteWebAuthnCredential: vi.fn((_body: unknown): Promise<{ status?: number } | undefined> => Promise.resolve({ status: 200 })),
  getAuthenticators: vi.fn((): Promise<{ status: 200, data: Authenticator[] } | undefined> => Promise.resolve(undefined)),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ updateWebAuthnCredential, deleteWebAuthnCredential, getAuthenticators }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const KEY = makeAuthenticator('webauthn', { id: 2, name: 'YubiKey 5C' })

beforeEach(() => {
  useAuthStore().authenticators = [KEY]
})

const mountList = () => mountSuspended(List, { route: false })
const button = (wrapper: VueWrapper, label: string) => wrapper.findAll('button').find(candidate => candidate.text() === label)

/**
 * Choose "Edit" in the row's actions menu. The menu renders its items in
 * a portal only once opened by pointer events, so the item is selected
 * through the menu's own `items`, exactly as a click on it calls it.
 */
async function chooseEdit(wrapper: VueWrapper) {
  const items = wrapper.findComponent({ name: 'UDropdownMenu' }).props('items') as DropdownMenuItem[][]
  const edit = items.flat().find(item => item.label === useNuxtApp().$i18n.t('edit.title'))!
  edit.onSelect?.(new Event('select'))
  await flushPromises()
}

describe('webside Account/2Fa/WebAuthn/List', () => {
  it('shows the name as text until Edit opens a bordered input with Save and Cancel', async () => {
    const wrapper = await mountList()
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('YubiKey 5C')

    await chooseEdit(wrapper)

    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('YubiKey 5C')
    expect(button(wrapper, useNuxtApp().$i18n.t('save'))).toBeDefined()
    expect(button(wrapper, useNuxtApp().$i18n.t('cancel'))).toBeDefined()
  })

  it('saves on Enter and shows the new name once the API kept it', async () => {
    const auth = useAuthStore()
    // Allauth's answer to the read after the rename: the key under its new name.
    vi.spyOn(auth, 'setupAuthenticators').mockImplementation(async () => {
      auth.authenticators = [{ ...KEY, name: 'Κλειδί γραφείου' }]
    })
    const wrapper = await mountList()
    await chooseEdit(wrapper)

    await wrapper.find('input').setValue('Κλειδί γραφείου')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateWebAuthnCredential).toHaveBeenCalledWith({ id: 2, name: 'Κλειδί γραφείου' })
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('Κλειδί γραφείου')
  })

  it('cancels on Escape and keeps the old name', async () => {
    const wrapper = await mountList()
    await chooseEdit(wrapper)

    await wrapper.find('input').setValue('κάτι άλλο')
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('YubiKey 5C')
    expect(updateWebAuthnCredential).not.toHaveBeenCalled()
  })

  it('keeps the old name when the API refuses the new one', async () => {
    updateWebAuthnCredential.mockResolvedValueOnce({ status: 400 })
    const wrapper = await mountList()
    await chooseEdit(wrapper)

    await wrapper.find('input').setValue('Κλειδί γραφείου')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))

    await button(wrapper, useNuxtApp().$i18n.t('cancel'))!.trigger('click')

    expect(wrapper.text()).toContain('YubiKey 5C')
    expect(wrapper.text()).not.toContain('Κλειδί γραφείου')
  })
})
