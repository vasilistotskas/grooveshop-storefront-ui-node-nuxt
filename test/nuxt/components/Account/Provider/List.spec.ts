import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ProviderList from '~/components/Account/Provider/List.vue'
import WebsideProviderList from '~/components/variants/webside/Account/Provider/List.vue'
import type { Provider } from '~~/shared/types/model/all-auth'
import { makeAllAuthConfig, makeSocialProvider } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * The social sign-in buttons (`useSocialProviders`, shared by both trees):
 * one per provider the store can actually sign anyone in with, never one
 * for a provider without credentials. A provider that can hand the browser
 * a token signs in in place; one that only redirects sends the browser
 * through allauth's own page. Mocked at `useAllAuthAuthentication`.
 */
const { providerRedirect, browserProviderRedirect } = vi.hoisted(() => ({
  providerRedirect: vi.fn((_provider: unknown) => {}),
  browserProviderRedirect: vi.fn((_body: unknown) => Promise.resolve()),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ providerRedirect, browserProviderRedirect }))

const GOOGLE = makeSocialProvider()
const GITHUB = makeSocialProvider({ id: 'github', name: 'GitHub', client_id: 'github-client-id', flows: ['provider_redirect'] })
const UNUSABLE = makeSocialProvider({ id: 'facebook', name: 'Facebook', client_id: '' })

function offer(...providers: Provider[]) {
  useAuthStore().config = makeAllAuthConfig({ socialaccount: { providers } }).data
}

describe.each(trees(ProviderList, WebsideProviderList))('$tree Account/Provider/List', ({ C }) => {
  async function mountList() {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    offer(GOOGLE, GITHUB, UNUSABLE)
  })

  it('draws a button for each provider that can sign someone in, and none for one without credentials', async () => {
    const wrapper = await mountList()

    expect(wrapper.findAll('li button')).toHaveLength(2)
    expect(wrapper.html()).not.toContain('Facebook')
  })

  it('signs in in place with a provider that hands the browser a token', async () => {
    const wrapper = await mountList()

    await wrapper.findAll('li button')[0]!.trigger('click')

    expect(providerRedirect).toHaveBeenCalledExactlyOnceWith(GOOGLE)
    expect(browserProviderRedirect).not.toHaveBeenCalled()
  })

  it('sends the browser through its own page for a provider that only redirects', async () => {
    const wrapper = await mountList()

    await wrapper.findAll('li button')[1]!.trigger('click')

    expect(browserProviderRedirect).toHaveBeenCalledExactlyOnceWith({
      provider: 'github',
      callback_url: '/account/provider/callback',
      process: 'login',
    })
    expect(providerRedirect).not.toHaveBeenCalled()
  })

  it('has no buttons on a store with no provider', async () => {
    offer()

    const wrapper = await mountList()

    expect(wrapper.findAll('li button')).toHaveLength(0)
  })
})
