import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  ACCESSIBILITY_DEFAULTS,
  ACCESSIBILITY_STORAGE_KEY,
  accessibilityClasses,
  accessibilityHeadScript,
  parseAccessibilityPreferences,
} from '~/utils/accessibilityPreferences'

describe('accessibilityClasses', () => {
  it('maps nothing to nothing, so a default visitor gets a bare <html>', () => {
    expect(accessibilityClasses(ACCESSIBILITY_DEFAULTS)).toEqual([])
  })

  it('names the text step and every toggle that is on', () => {
    expect(accessibilityClasses({ ...ACCESSIBILITY_DEFAULTS, textScale: 2, contrast: true, motion: true }))
      .toEqual(['a11y-text-2', 'a11y-contrast', 'a11y-motion'])
  })
})

describe('parseAccessibilityPreferences', () => {
  it.each([
    ['nothing stored', null],
    ['malformed JSON', '{"contrast":'],
    ['a non-object', '"contrast"'],
  ])('falls back to the defaults for %s', (_name, raw) => {
    expect(parseAccessibilityPreferences(raw)).toEqual(ACCESSIBILITY_DEFAULTS)
  })

  it('keeps only real booleans and a text step that exists', () => {
    const raw = JSON.stringify({ textScale: 9, contrast: true, grayscale: 'true', links: 1, unknown: true })

    expect(parseAccessibilityPreferences(raw)).toEqual({ ...ACCESSIBILITY_DEFAULTS, contrast: true })
  })
})

describe('accessibilityHeadScript', () => {
  /** Runs the inline script, as the page does, against a stored value; returns the classes it added to <html>. */
  function runWith(stored: string | null) {
    const added: string[] = []
    runInNewContext(accessibilityHeadScript(), {
      localStorage: { getItem: (key: string) => (key === ACCESSIBILITY_STORAGE_KEY ? stored : null) },
      document: { documentElement: { classList: { add: (name: string) => { added.push(name) } } } },
      JSON,
      Number,
    })
    return added
  }

  it('applies the stored preferences before the first paint', () => {
    expect(runWith(JSON.stringify({ textScale: 1, contrast: true, links: true }))).toEqual(['a11y-text-1', 'a11y-contrast', 'a11y-links'])
  })

  it('ignores a text step that does not exist and values that are not true', () => {
    expect(runWith(JSON.stringify({ textScale: 7, grayscale: 'yes' }))).toEqual([])
  })

  it('never throws on malformed storage', () => {
    expect(runWith('{"contrast":')).toEqual([])
  })
})
