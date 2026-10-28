import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import { mergeStoreTexts } from '~/utils/textOverrides'
import type { MessageComposer } from '~/utils/textOverrides'

const FOOTER = 'components/Chrome/Footer'
const COOKIE = 'components/Cookie/Banner'

/** `t` as the specs call it: the app's typed message keys would make vue-i18n's own `t` overloads too deep to instantiate. */
type TestComposer = MessageComposer & { t: (key: string, named?: Record<string, unknown>, options?: { locale: string }) => string }

function composer(messages: Record<string, unknown>): TestComposer {
  return createI18n({ legacy: false, locale: 'el', fallbackLocale: 'el', messages: messages as never }).global as unknown as TestComposer
}

/** Fresh each time: a composer merges into the objects it was given. */
const defaults = () => ({
  el: { tagline: 'Προεπιλογή', links: { about: 'Σχετικά', contact: 'Επικοινωνία' }, greeting: 'Γεια {name}' },
  en: { tagline: 'Default', links: { about: 'About', contact: 'Contact' } },
})

describe('mergeStoreTexts', () => {
  it('replaces a text of the namespace and leaves every other key as the block has it', () => {
    const i18n = composer(defaults())

    mergeStoreTexts(i18n, 'el', FOOTER, { 'tagline': 'Δική μας', 'links.about': 'Ποιοι είμαστε' })

    expect(i18n.t('tagline')).toBe('Δική μας')
    expect(i18n.t('links.about')).toBe('Ποιοι είμαστε')
    expect(i18n.t('links.contact')).toBe('Επικοινωνία')
    expect(i18n.t('greeting', { name: 'Ελένη' })).toBe('Γεια Ελένη')
  })

  it('compiles an override with its parameters, as it does the defaults', () => {
    const i18n = composer(defaults())

    mergeStoreTexts(i18n, 'el', FOOTER, { greeting: 'Καλώς ήρθες, {name}!' })

    expect(i18n.t('greeting', { name: 'Ελένη' })).toBe('Καλώς ήρθες, Ελένη!')
  })

  it('merges only the locale it is given', () => {
    const i18n = composer(defaults())

    mergeStoreTexts(i18n, 'en', FOOTER, { tagline: 'Ours' })

    expect(i18n.t('tagline', {}, { locale: 'en' })).toBe('Ours')
    expect(i18n.t('tagline', {}, { locale: 'el' })).toBe('Προεπιλογή')
  })

  it('merges over a message the build compiled', () => {
    const i18n = composer({ el: { tagline: () => 'compiled default' } })

    mergeStoreTexts(i18n, 'el', FOOTER, { tagline: 'Δική μας' })

    expect(i18n.t('tagline')).toBe('Δική μας')
  })

  it('ignores a locked text', () => {
    const i18n = composer({ el: { title: 'Cookies' } })

    mergeStoreTexts(i18n, 'el', COOKIE, { title: 'Hacked' })

    expect(i18n.t('title')).toBe('Cookies')
  })

  it('ignores a key the build does not have, so a stale override adds nothing', () => {
    const i18n = composer(defaults())

    mergeStoreTexts(i18n, 'el', FOOTER, { 'removed': 'x', 'links.gone': 'y', 'links.about.deeper': 'z' })

    expect(i18n.getLocaleMessage('el')).toEqual(defaults().el)
  })

  it('ignores a key that names a group, so a stale override cannot replace the group', () => {
    const i18n = composer(defaults())

    mergeStoreTexts(i18n, 'el', FOOTER, { links: 'flat' })

    expect(i18n.t('links.about')).toBe('Σχετικά')
  })

  it('ignores a name every object inherits', () => {
    const i18n = composer(defaults())

    mergeStoreTexts(i18n, 'el', FOOTER, { 'constructor': 'x', 'toString': 'y', '__proto__.polluted': 'z' })

    expect(i18n.getLocaleMessage('el')).toEqual(defaults().el)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('does nothing without texts', () => {
    const i18n = composer(defaults())

    mergeStoreTexts(i18n, 'el', FOOTER, undefined)

    expect(i18n.getLocaleMessage('el')).toEqual(defaults().el)
  })
})
