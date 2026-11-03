import { describe, expect, it } from 'vitest'
import { authPanelTagline } from '~~/shared/utils/authPanel'

const panel = (extra: Partial<AuthPanel> = {}): AuthPanel => ({
  imageUrl: 'media/demo/uploads/hero-audio.jpg',
  tagline: 'Ακουστικά που κάθονται σωστά.',
  i18n: { en: { tagline: 'Earbuds that actually fit.' } },
  ...extra,
})

describe('authPanelTagline', () => {
  it('uses the override for the page locale', () => {
    expect(authPanelTagline(panel(), 'en')).toBe('Earbuds that actually fit.')
  })

  it('falls back to the default wording for a locale with no override', () => {
    expect(authPanelTagline(panel(), 'el')).toBe('Ακουστικά που κάθονται σωστά.')
  })

  it('is empty when the setting has no wording at all', () => {
    expect(authPanelTagline({ imageUrl: 'a.jpg' }, 'en')).toBe('')
  })
})
