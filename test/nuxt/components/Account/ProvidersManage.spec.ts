import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ProvidersManage from '~/components/Account/ProvidersManage.vue'
import type { Provider, ProviderAccount } from '~~/shared/types/model/all-auth'
import { asProxiedError, makeAllAuthConfig, makeBadResponse, makeProviderAccount, makeSocialProvider } from '~~/test/fixtures/allauth'

/**
 * The social accounts linked to the shopper's: a card per linked account
 * with "Disconnect", one per provider the store offers that is not
 * linked yet with "Connect" — only for a provider the storefront can
 * link (the token flow) — and the linked accounts of a provider the
 * store no longer offers, so they can still be unlinked. Nothing at all
 * when there is neither. Mocked at `useAllAuthAccount` /
 * `useAllAuthAuthentication`; the store's providers are the real auth
 * store's `/config`.
 */
const { connectedThirdPartyProviderAccounts, disconnectThirdPartyProviderAccount, providerRedirect, toastAdd } = vi.hoisted(() => ({
  connectedThirdPartyProviderAccounts: vi.fn((): Promise<{ status: 200, data: ProviderAccount[] }> => Promise.resolve({ status: 200, data: [] })),
  disconnectThirdPartyProviderAccount: vi.fn((_body: { provider: string, account: string }): Promise<{ status: 200, data: ProviderAccount[] }> => Promise.resolve({ status: 200, data: [] })),
  providerRedirect: vi.fn((_provider: unknown, _process: unknown) => {}),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ connectedThirdPartyProviderAccounts, disconnectThirdPartyProviderAccount }))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ providerRedirect }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const GOOGLE = makeSocialProvider()
const FACEBOOK = makeSocialProvider({ id: 'facebook', name: 'Facebook', client_id: 'facebook-client-id' })
const GITHUB = makeSocialProvider({ id: 'github', name: 'GitHub', client_id: 'github-client-id', flows: ['provider_redirect'] })

const GOOGLE_ACCOUNT = makeProviderAccount()
const DISCORD_ACCOUNT = makeProviderAccount({ uid: '42', display: 'demo#4242', provider: { id: 'discord', name: 'Discord', flows: ['provider_redirect'] } })

function offer(...providers: Provider[]) {
  useAuthStore().config = makeAllAuthConfig({ socialaccount: { providers } }).data
}

function link(...accounts: ProviderAccount[]) {
  connectedThirdPartyProviderAccounts.mockResolvedValue({ status: 200, data: accounts })
}

beforeEach(() => {
  clearNuxtData('providerAccounts')
  offer(GOOGLE, FACEBOOK, GITHUB)
  link(GOOGLE_ACCOUNT)
})

async function mountProviders() {
  const wrapper = await mountSuspended(ProvidersManage, { route: false })
  await flushPromises()
  return wrapper
}

const cards = (wrapper: VueWrapper) => wrapper.findAll('li').map(card => card.text())
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(candidate => candidate.attributes('aria-label') === label)!

describe('Account/ProvidersManage', () => {
  it('shows each linked account, and a connect card for an offered provider it can link', async () => {
    const wrapper = await mountProviders()

    expect(cards(wrapper)).toEqual([
      'Googleshopper@example.comΑποσύνδεση',
      'FacebookΔεν έχει συνδεθείΣύνδεση',
    ])
  })

  it('keeps the accounts of a provider the store stopped offering, so they can be unlinked', async () => {
    link(GOOGLE_ACCOUNT, DISCORD_ACCOUNT)

    const wrapper = await mountProviders()

    expect(cards(wrapper)).toContain('Discorddemo#4242Αποσύνδεση')
  })

  it('renders nothing when the store offers no provider and nothing is linked', async () => {
    offer()
    link()

    const wrapper = await mountProviders()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('connects through the storefront\'s own OAuth route, as a link and not a sign-in', async () => {
    const wrapper = await mountProviders()

    await button(wrapper, 'Σύνδεση λογαριασμού Facebook').trigger('click')

    expect(providerRedirect).toHaveBeenCalledExactlyOnceWith(FACEBOOK, 'connect')
  })

  it('takes one change at a time', async () => {
    disconnectThirdPartyProviderAccount.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountProviders()

    await button(wrapper, 'Αποσύνδεση του λογαριασμού Google shopper@example.com').trigger('click')
    await button(wrapper, 'Σύνδεση λογαριασμού Facebook').trigger('click')

    expect(providerRedirect).not.toHaveBeenCalled()
    expect(button(wrapper, 'Σύνδεση λογαριασμού Facebook').attributes('disabled')).toBeDefined()
  })

  it('disconnects an account and shows the accounts allauth has left', async () => {
    disconnectThirdPartyProviderAccount.mockResolvedValue({ status: 200, data: [] })
    const wrapper = await mountProviders()

    await button(wrapper, 'Αποσύνδεση του λογαριασμού Google shopper@example.com').trigger('click')
    await flushPromises()

    expect(disconnectThirdPartyProviderAccount).toHaveBeenCalledExactlyOnceWith({ provider: 'google', account: '104857600123' })
    expect(cards(wrapper)).toEqual([
      'GoogleΔεν έχει συνδεθείΣύνδεση',
      'FacebookΔεν έχει συνδεθείΣύνδεση',
    ])
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith({ title: 'Ο λογαριασμός Google αποσυνδέθηκε', color: 'success' })
  })

  it('keeps the account and says why when allauth refuses to unlink it', async () => {
    disconnectThirdPartyProviderAccount.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'no_password', message: 'Your account has no password set up.' })))
    const wrapper = await mountProviders()

    await button(wrapper, 'Αποσύνδεση του λογαριασμού Google shopper@example.com').trigger('click')
    await flushPromises()

    expect(cards(wrapper)[0]).toBe('Googleshopper@example.comΑποσύνδεση')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })
})
