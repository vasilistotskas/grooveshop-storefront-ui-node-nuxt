import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type * as z from 'zod'
import ProvidersManage from '~/components/Account/ProvidersManage.vue'
import type { ZodProviderAccount } from '~~/shared/schemas/model/all-auth'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'

/**
 * The third-party accounts linked to this one, through allauth's
 * `/account/providers`: listed, and disconnected one at a time (the
 * request names the provider's ID and the account's uid, not the
 * display name). Mocked at `useAllAuthAccount`; the list is its
 * `useAsyncData` (`providerAccounts`), re-read after a disconnect.
 *
 * The count comes from the component's own `<i18n>` block, which
 * `$i18n.t` cannot see, so that Greek is asserted as written there.
 */
type ProviderAccount = z.infer<typeof ZodProviderAccount>

// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const { connectedThirdPartyProviderAccounts, disconnectThirdPartyProviderAccount, toastAdd } = vi.hoisted(() => ({
  connectedThirdPartyProviderAccounts: vi.fn((): Promise<{ status: number, data: ProviderAccount[] }> => Promise.resolve({ status: 200, data: [] })),
  disconnectThirdPartyProviderAccount: vi.fn((_body: { provider: string, account: string }) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ connectedThirdPartyProviderAccounts, disconnectThirdPartyProviderAccount }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const account = (providerId: string, name: string, uid: string, display: string): ProviderAccount => ({
  uid,
  display,
  provider: { id: providerId, name, flows: ['provider_redirect'] },
})

const GOOGLE = account('google', 'Google', '108234567890123456789012', 'shopper@gmail.com')
const GITHUB = account('github', 'GitHub', '4242', 'shopper-gh')

const accounts = (data: ProviderAccount[]) => ({ status: 200, data })

beforeEach(() => {
  clearNuxtData('providerAccounts')
  connectedThirdPartyProviderAccounts.mockResolvedValue(accounts([GOOGLE, GITHUB]))
})

async function mountProviders() {
  const wrapper = await mountSuspended(ProvidersManage, { route: false })
  // The table sits in `<ClientOnly>`.
  await flushPromises()
  return wrapper
}

const rows = (wrapper: VueWrapper) => wrapper.findAll('tbody tr')
/** The row's menu items, as the component hands them to its UDropdownMenu (Reka teleports the open menu). */
const disconnectItem = (wrapper: VueWrapper, row: number) =>
  (wrapper.findAllComponents({ name: 'UDropdownMenu' })[row]!.props('items')[0] as Array<{ label: string, onSelect: () => unknown }>)[0]!

describe('Account/ProvidersManage', () => {
  it('says no provider is linked yet, and how to link one', async () => {
    connectedThirdPartyProviderAccounts.mockResolvedValue(accounts([]))

    const wrapper = await mountProviders()

    // Nuxt UI v4's table takes its empty state through the `#empty` slot;
    // an `empty-state` object fell through as an attribute and the shopper
    // read the generic "no data" instead.
    expect(wrapper.text()).toContain('Δεν έχεις συνδεθεί με κάποιον πάροχο')
    expect(wrapper.text()).toContain('Σύνδεσε λογαριασμούς τρίτων για ευκολότερη σύνδεση')
  })

  it('lists each linked account with its provider and the account it signs in as', async () => {
    const wrapper = await mountProviders()

    const cells = rows(wrapper).map(row => row.findAll('td').map(cell => cell.text()))
    expect(cells.map(([provider, display]) => [provider, display])).toEqual([
      ['Google', 'shopper@gmail.com'],
      ['GitHub', 'shopper-gh'],
    ])
  })

  it('shortens a long provider uid and keeps a short one whole', async () => {
    const wrapper = await mountProviders()

    const uids = rows(wrapper).map(row => row.findAll('td')[2]!.text())
    expect(uids).toEqual(['10823456789012345678...', '4242'])
  })

  it('disconnects by the provider ID and the account uid, then reads the list again', async () => {
    const wrapper = await mountProviders()
    connectedThirdPartyProviderAccounts.mockResolvedValue(accounts([GITHUB]))

    const item = disconnectItem(wrapper, 0)
    expect(item.label).toBe(useNuxtApp().$i18n.t('disconnect'))
    await item.onSelect()
    await flushPromises()

    expect(disconnectThirdPartyProviderAccount).toHaveBeenCalledWith({ provider: 'google', account: GOOGLE.uid })
    expect(rows(wrapper).map(row => row.find('td').text())).toEqual(['GitHub'])
    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('success.title'), color: 'success' })
    expect(wrapper.emitted('disconnectThirdPartyProviderAccount')).toHaveLength(1)
  })

  it('shows what allauth refused and keeps the account listed', async () => {
    disconnectThirdPartyProviderAccount.mockRejectedValue(asProxiedError(
      makeBadResponse({ code: 'no_password', param: 'account', message: 'Your account has no password set up.' }),
    ))
    const wrapper = await mountProviders()

    await disconnectItem(wrapper, 1).onSelect()
    await flushPromises()

    const { t, te } = useNuxtApp().$i18n
    const key = 'validation.api.no_password'
    expect(toastAdd).toHaveBeenCalledWith({ title: te(key) ? t(key) : 'Your account has no password set up.', color: 'error' })
    expect(rows(wrapper)).toHaveLength(2)
    expect(wrapper.emitted('disconnectThirdPartyProviderAccount')).toBeUndefined()
  })

  it.each([
    [[GOOGLE, GITHUB], '2 συνδεδεμένοι πάροχοι'],
    [[GITHUB], '1 Συνδεδεμένος πάροχος'],
    [[], 'Κανένας συνδεδεμένος πάροχος'],
  ] as const)('counts the linked accounts (%#)', async (data, total) => {
    connectedThirdPartyProviderAccounts.mockResolvedValue(accounts([...data]))

    const wrapper = await mountProviders()

    expect(wrapper.text()).toContain(total)
  })
})
