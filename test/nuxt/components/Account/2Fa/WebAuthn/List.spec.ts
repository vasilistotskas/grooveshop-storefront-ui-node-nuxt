import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import List from '~/components/Account/2Fa/WebAuthn/List.vue'
import WebsideList from '~/components/variants/webside/Account/2Fa/WebAuthn/List.vue'
import type { Authenticator } from '~~/shared/types/model/all-auth/account/authenticators/authenticators'
import { FIXTURE_EPOCH, makeAuthenticator } from '~~/test/fixtures/allauth'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'
import { TOOLTIP_STUB, pickFromRowMenu } from '~~/test/helpers/rowMenu'

/**
 * The shopper's passkeys and security keys: one row per WebAuthn key —
 * name, passkey or security key, when added and last used — renamed in
 * place or removed once confirmed, one change at a time, then the auth
 * store read again so every reader of it counts the same keys
 * (`useWebAuthnKeys`, shared by both trees). The default draws rows and
 * asks before removing; the webside design draws a table whose row menu
 * edits or removes at once and, with no key left, goes back to the
 * two-step page. Mocked at `useAllAuthAccount`; the keys come from the
 * real auth store.
 */
const { deleteWebAuthnCredential, updateWebAuthnCredential, getAuthenticators, toastAdd, navigateToMock } = vi.hoisted(() => ({
  deleteWebAuthnCredential: vi.fn((_body: unknown): Promise<{ status?: number } | undefined> => Promise.resolve({ status: 200 })),
  updateWebAuthnCredential: vi.fn((_body: unknown): Promise<{ status?: number } | undefined> => Promise.resolve({ status: 200 })),
  getAuthenticators: vi.fn((): Promise<{ status: 200, data: Authenticator[] } | undefined> => Promise.resolve(undefined)),
  toastAdd: vi.fn(),
  navigateToMock: vi.fn(),
}))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useAllAuthAccount', () => () => ({ deleteWebAuthnCredential, updateWebAuthnCredential, getAuthenticators }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const DAY = 24 * 60 * 60
const PASSKEY = makeAuthenticator('webauthn', { id: 1, name: 'iPhone 16', is_passwordless: true, last_used_at: FIXTURE_EPOCH })
const SECURITY_KEY = makeAuthenticator('webauthn', { id: 2, name: 'YubiKey 5C', created_at: FIXTURE_EPOCH - 30 * DAY })
const KEYS = [PASSKEY, SECURITY_KEY, makeAuthenticator('totp'), makeAuthenticator('recovery_codes')]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXTURE_EPOCH * 1000)
  useAuthStore().authenticators = KEYS
  getAuthenticators.mockResolvedValue({ status: 200, data: KEYS })
})

afterEach(() => {
  vi.useRealTimers()
})

const COPY = {
  default: inlineCopy('app/components/Account/2Fa/WebAuthn/List.vue'),
  webside: inlineCopy('app/components/variants/webside/Account/2Fa/WebAuthn/List.vue'),
}

const rows = (wrapper: VueWrapper) => wrapper.findAll('li')
const row = (wrapper: VueWrapper, name: string) => rows(wrapper).find(item => item.text().includes(name))!
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(candidate => candidate.attributes('aria-label') === label || candidate.text() === label)!

const tableRow = (wrapper: VueWrapper, name: string) => wrapper.findAll('tbody tr').find(item => item.text().includes(name))!

describe.each(trees(List, WebsideList))('$tree Account/2Fa/WebAuthn/List', ({ tree, C }) => {
  const messages = COPY[tree]
  // The webside row menu sits in a tooltip, which needs the provider the app shell supplies.
  const mountList = () => mountSuspended(C, {
    route: false,
    attachTo: document.body,
    global: { stubs: TOOLTIP_STUB },
  })

  /** Rename `from` to `to`: row buttons in the default, the row menu in the webside table. */
  async function rename(wrapper: VueWrapper, from: string, to: string) {
    if (tree === 'default') await button(wrapper, `Μετονομασία του «${from}»`).trigger('click')
    else await pickFromRowMenu(tableRow(wrapper, from), useNuxtApp().$i18n.t('edit.title'))
    await wrapper.find('input').setValue(to)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  async function remove(wrapper: VueWrapper, name: string) {
    if (tree === 'default') {
      await button(wrapper, `Αφαίρεση του «${name}»`).trigger('click')
      await button(wrapper, `Επιβεβαίωση αφαίρεσης του «${name}»`).trigger('click')
    }
    else {
      await pickFromRowMenu(tableRow(wrapper, name), useNuxtApp().$i18n.t('delete.title'))
    }
    await flushPromises()
  }

  const removed = () => expect.objectContaining({ title: tree === 'default' ? messages.removed : useNuxtApp().$i18n.t('success.title'), color: 'success' })

  it.runIf(tree === 'default')('lists the WebAuthn keys only, each with its kind and dates', async () => {
    const wrapper = await mountList()

    expect(rows(wrapper)).toHaveLength(2)
    expect(row(wrapper, 'iPhone 16').text()).toContain(messages.passkey)
    expect(row(wrapper, 'iPhone 16').text()).toContain('1 Ιαν 2026')
    expect(row(wrapper, 'iPhone 16').text()).toContain('τώρα')
    expect(row(wrapper, 'YubiKey 5C').text()).toContain(messages.security_key)
    expect(row(wrapper, 'YubiKey 5C').text()).toContain('2 Δεκ 2025')
    expect(row(wrapper, 'YubiKey 5C').text()).toContain(messages.never)
  })

  it.runIf(tree === 'webside')('lists the WebAuthn keys only', async () => {
    const wrapper = await mountList()

    const names = wrapper.findAll('tbody tr').map(item => item.text())
    expect(names).toHaveLength(2)
    expect(names[0]).toContain('iPhone 16')
    expect(names[1]).toContain('YubiKey 5C')
  })

  it.runIf(tree === 'default')('says there is no key yet, and still offers to add one', async () => {
    useAuthStore().authenticators = [makeAuthenticator('totp')]

    const wrapper = await mountList()

    expect(rows(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain(messages.empty)
    expect(wrapper.find('a').attributes('href')).toBe('/account/2fa/webauthn/add')
  })

  it.runIf(tree === 'webside')('goes back to the two-step page when no key is left', async () => {
    useAuthStore().authenticators = [makeAuthenticator('totp')]

    await mountList()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-2fa'))
  })

  it('renames a key, says so, and reads the keys again', async () => {
    const wrapper = await mountList()

    await rename(wrapper, 'YubiKey 5C', '  Work key  ')

    expect(updateWebAuthnCredential).toHaveBeenCalledExactlyOnceWith({ id: 2, name: 'Work key' })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      title: tree === 'default' ? messages.renamed : useNuxtApp().$i18n.t('success.title'),
      color: 'success',
    }))
    expect(getAuthenticators).toHaveBeenCalledOnce()
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('does not send a blank name', async () => {
    const wrapper = await mountList()

    await rename(wrapper, 'YubiKey 5C', '   ')

    expect(updateWebAuthnCredential).not.toHaveBeenCalled()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('keeps the form open and says why when allauth refuses the new name', async () => {
    updateWebAuthnCredential.mockRejectedValue(Object.assign(new Error('Bad Request'), { statusCode: 400, data: { detail: 'Name too long.' } }))
    const wrapper = await mountList()

    await rename(wrapper, 'YubiKey 5C', 'x'.repeat(101))

    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'error' }))
    expect(wrapper.find('form').exists()).toBe(true)
    expect(getAuthenticators).toHaveBeenCalledOnce()
  })

  it.runIf(tree === 'default')('asks before removing a key, and keeps it on cancel', async () => {
    const wrapper = await mountList()

    await button(wrapper, 'Αφαίρεση του «iPhone 16»').trigger('click')

    expect(row(wrapper, 'iPhone 16').text()).toContain(messages.confirm_remove)
    expect(deleteWebAuthnCredential).not.toHaveBeenCalled()

    await button(wrapper, messages.cancel).trigger('click')

    expect(row(wrapper, 'iPhone 16').text()).not.toContain(messages.confirm_remove)
    expect(deleteWebAuthnCredential).not.toHaveBeenCalled()
  })

  it('removes a key once confirmed, and reads the keys again', async () => {
    const wrapper = await mountList()

    await remove(wrapper, 'iPhone 16')

    expect(deleteWebAuthnCredential).toHaveBeenCalledExactlyOnceWith({ authenticators: [1] })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(removed())
    expect(getAuthenticators).toHaveBeenCalledOnce()
  })

  it.runIf(tree === 'default')('takes one change at a time', async () => {
    deleteWebAuthnCredential.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountList()

    await button(wrapper, 'Αφαίρεση του «iPhone 16»').trigger('click')
    await button(wrapper, 'Επιβεβαίωση αφαίρεσης του «iPhone 16»').trigger('click')

    expect(button(wrapper, 'Μετονομασία του «YubiKey 5C»').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Αφαίρεση του «YubiKey 5C»').attributes('disabled')).toBeDefined()
  })

  it('says the change failed when allauth answers anything but 200, and reads the keys again', async () => {
    deleteWebAuthnCredential.mockResolvedValue({ status: 401 })
    const wrapper = await mountList()

    await remove(wrapper, 'iPhone 16')

    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      title: tree === 'default' ? messages.error : useNuxtApp().$i18n.t('error.default'),
      color: 'error',
    }))
    expect(getAuthenticators).toHaveBeenCalledOnce()
  })
})
