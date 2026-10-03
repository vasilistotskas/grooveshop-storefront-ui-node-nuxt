import { describe, it, expect, beforeEach } from 'vitest'
import { makeAllAuthConfig } from '~~/test/fixtures/allauth'

/**
 * allauth lists every provider the store has an app row for, credentials
 * or not. The sign-in and sign-up pages draw only the ones that can sign
 * someone in, and nothing at all (no divider) when none can.
 */
const withProviders = (...providers: { id: string, client_id?: string }[]) =>
  makeAllAuthConfig({
    socialaccount: { providers: providers.map(provider => ({ name: provider.id, flows: ['provider_redirect'], ...provider })) },
  }).data

describe('useSocialProviders', () => {
  beforeEach(() => {
    useAuthStore().config = undefined
  })

  it('keeps the providers with credentials and drops the ones without', () => {
    useAuthStore().config = withProviders({ id: 'google', client_id: 'google-app' }, { id: 'facebook', client_id: '' })

    const { providers, hasProviders } = useSocialProviders()

    expect(providers.value.map(provider => provider.id)).toEqual(['google'])
    expect(hasProviders.value).toBe(true)
  })

  it('keeps a provider listed without a client id: allauth sends one for OAuth2 providers only', () => {
    useAuthStore().config = withProviders({ id: 'google' })

    expect(useSocialProviders().providers.value.map(provider => provider.id)).toEqual(['google'])
  })

  it('offers none when no provider has credentials', () => {
    useAuthStore().config = withProviders({ id: 'google', client_id: '' })

    expect(useSocialProviders().hasProviders.value).toBe(false)
  })

  it('offers none before the allauth config has loaded', () => {
    const { providers, hasProviders } = useSocialProviders()

    expect(providers.value).toEqual([])
    expect(hasProviders.value).toBe(false)
  })
})
