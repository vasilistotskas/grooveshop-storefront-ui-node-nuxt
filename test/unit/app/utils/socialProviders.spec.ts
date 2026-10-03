import { describe, it, expect } from 'vitest'
import { canConnectSocialProvider, socialProviderIcon } from '~/utils/socialProviders'
import { makeSocialProvider } from '~~/test/fixtures/allauth'

describe('socialProviderIcon', () => {
  it.each([
    ['google', 'i-mdi-google'],
    ['facebook', 'i-mdi-facebook'],
    ['github', 'i-mdi-github'],
    ['discord', 'i-mdi-discord'],
  ])('draws %s with its brand icon', (id, icon) => {
    expect(socialProviderIcon(id)).toBe(icon)
  })

  it('draws a provider with no mapped icon with the generic sign-in glyph', () => {
    expect(socialProviderIcon('apple')).toBe('i-lucide-log-in')
  })
})

describe('canConnectSocialProvider', () => {
  it('links a provider that offers the token flow', () => {
    expect(canConnectSocialProvider(makeSocialProvider({ flows: ['provider_redirect', 'provider_token'] }))).toBe(true)
  })

  // The redirect flow runs on Django's origin, where the browser holds no
  // session: allauth would refuse to link the account to anyone.
  it('does not link a redirect-only provider', () => {
    expect(canConnectSocialProvider(makeSocialProvider({ id: 'github', flows: ['provider_redirect'] }))).toBe(false)
  })
})
