import { describe, expect, it } from 'vitest'

import {
  authPanelTagline,
  isAuthPanel,
  parseAuthPanelValue,
} from '../../../../shared/schemas/authPanel'

/**
 * The render-time mirror of Django's `validate_auth_panel_setting`: a
 * shape the write side refuses must be refused here too, and one it
 * accepts must render.
 */
const panel = (extra: Record<string, unknown> = {}) => ({
  imageUrl: 'media/demo/uploads/hero-audio.jpg',
  tagline: 'Ακουστικά που κάθονται σωστά.',
  i18n: { en: { tagline: 'Earbuds that actually fit.' } },
  ...extra,
})

describe('isAuthPanel', () => {
  it.each([
    ['every key', panel()],
    ['the photo alone', { imageUrl: 'media/demo/uploads/a.jpg' }],
    ['the tagline alone', { tagline: 'Hello' }],
    ['an empty object', {}],
  ])('accepts %s', (_case, value) => {
    expect(isAuthPanel(value)).toBe(true)
  })

  it.each([
    ['an unknown key', panel({ color: 'red' })],
    ['a non-string photo', panel({ imageUrl: 3 })],
    ['a photo over 1000 characters', panel({ imageUrl: 'x'.repeat(1001) })],
    ['a tagline over 200 characters', panel({ tagline: 'x'.repeat(201) })],
    ['an i18n list', panel({ i18n: [] })],
    ['an override that is not an object', panel({ i18n: { en: 'Hi' } })],
    ['an override with another key', panel({ i18n: { en: { tagline: 'Hi', text: 'Hi' } } })],
    ['an override tagline over 200 characters', panel({ i18n: { en: { tagline: 'x'.repeat(201) } } })],
    ['an array', []],
    ['null', null],
  ])('rejects %s', (_case, value) => {
    expect(isAuthPanel(value)).toBe(false)
  })
})

describe('parseAuthPanelValue', () => {
  it('parses a valid setting', () => {
    expect(parseAuthPanelValue(JSON.stringify(panel()))).toEqual(panel())
  })

  it.each([
    ['empty', ''],
    ['malformed JSON', '{"tagline":'],
    ['a rejected shape', JSON.stringify(panel({ nope: true }))],
  ])('gives null for %s', (_case, raw) => {
    expect(parseAuthPanelValue(raw)).toBeNull()
  })
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
