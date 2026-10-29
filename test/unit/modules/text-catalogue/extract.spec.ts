import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALE_FILES, LOCALE_FILES_DIR } from '~~/i18n/locales'
import { buildTextCatalogue, flattenMessages, namespaceOf, readBlockMessages } from '~~/modules/text-catalogue/extract'
import { TEXT_FIXTURE_SOURCE } from '~~/test/fixtures/texts/source'
import { REAL_TEXT_SOURCE } from '~~/test/helpers/realTextSource'

const REPO = join(import.meta.dirname, '../../../..')

const fixture = buildTextCatalogue(TEXT_FIXTURE_SOURCE)
const entry = (namespace: string, key: string) => {
  const found = fixture.entries.find(candidate => candidate.namespace === namespace && candidate.key === key)
  if (!found) throw new Error(`the fixture catalogue has no ${namespace} ${key}`)
  return found
}

describe('namespaceOf', () => {
  it('is the path under app/ without .vue, with forward slashes', () => {
    expect(namespaceOf(join('/repo', 'app'), join('/repo', 'app', 'components', 'Chrome', 'Footer.vue'))).toBe('components/Chrome/Footer')
    expect(namespaceOf(join('/repo', 'app'), join('/repo', 'app', 'error.vue'))).toBe('error')
  })
})

describe('flattenMessages', () => {
  it('keeps the string leaves by dotted path, array items by index, and drops flags', () => {
    const leaves = flattenMessages({ a: { b: 'x' }, list: [{ label: 'y', live: true }], n: 3, nothing: null })

    expect([...leaves]).toEqual([['a.b', 'x'], ['list.0.label', 'y']])
  })
})

describe('readBlockMessages', () => {
  const sfc = (block: string) => `<template><p /></template>\n${block}`

  it('rejects a locale the app does not have', () => {
    expect(() => readBlockMessages(sfc('<i18n lang="yaml">\nde:\n  a: b\n</i18n>'), 'X.vue', ['el', 'en']))
      .toThrow('X.vue: <i18n> block names the locale "de"')
  })

  it('rejects a block that is not yaml', () => {
    expect(() => readBlockMessages(sfc('<i18n>{"el":{"a":"b"}}</i18n>'), 'X.vue', ['el']))
      .toThrow('X.vue: an <i18n> block must be lang="yaml"')
  })
})

describe('buildTextCatalogue over the fixture tree', () => {
  it('names a component block entry by its path and its dotted key, with each locale\'s default', () => {
    expect(entry('components/Demo/Greeting', 'welcome')).toMatchObject({
      defaults: { el: 'Γεια σου {name}', en: 'Hello {name}' },
      placeholders: {
        el: { params: ['named:name'], pluralCases: 1 },
        en: { params: ['named:name'], pluralCases: 1 },
      },
      locked: false,
    })
  })

  it('reads list, linked, linked-with-modifier and plural messages', () => {
    expect(entry('components/Demo/Greeting', 'total').placeholders.el).toEqual({ params: ['list:0'], pluralCases: 1 })
    expect(entry('components/Demo/Greeting', 'signature').placeholders.el).toEqual({ params: ['linked:brand.name'], pluralCases: 1 })
    expect(entry('components/Demo/Greeting', 'shout').placeholders.en).toEqual({ params: ['linked:brand.name|upper'], pluralCases: 1 })
    expect(entry('components/Demo/Greeting', 'items').placeholders.en).toEqual({ params: ['named:count'], pluralCases: 2 })
  })

  it('keeps a locale\'s own shape when the locales differ', () => {
    const readingTime = entry('components/Demo/Greeting', 'reading_time')

    expect(readingTime.placeholders.el?.pluralCases).toBe(2)
    expect(readingTime.placeholders.en?.pluralCases).toBe(1)
  })

  it('lists a key only one locale defines with that locale alone', () => {
    expect(entry('components/Demo/Greeting', 'only_en').defaults).toEqual({ en: 'English only {name}' })
  })

  it('reaches into arrays and leaves out flags', () => {
    expect(entry('components/Demo/Greeting', 'rows.0.label').defaults).toEqual({ el: 'Πρώτο', en: 'First' })
    expect(fixture.entries.some(({ key }) => key === 'rows.0.live')).toBe(false)
  })

  it('files the global locale files under "global", merging every file of a locale', () => {
    expect(entry('global', 'cart.empty').defaults).toEqual({ el: 'Το καλάθι είναι άδειο', en: 'Your cart is empty' })
    expect(entry('global', 'cart.count').placeholders.el).toEqual({ params: ['named:n'], pluralCases: 2 })
    expect(entry('global', 'validation.required').defaults.en).toBe('{field} is required')
  })

  it('has no entry for a component without a block', () => {
    expect(fixture.entries.some(({ namespace }) => namespace === 'components/NoMessages')).toBe(false)
  })

  it('locks the Omnibus label in both trees, the cookie dialog, validation, error codes and legal titles', () => {
    const locked = fixture.entries.filter(({ locked }) => locked).map(({ namespace, key }) => `${namespace} ${key}`)

    expect(locked).toEqual([
      'components/Cookie/Modal accept',
      'components/Cookie/Modal title',
      'components/Product/PriorPrice label',
      'components/variants/webside/Product/PriorPrice label',
      'global breadcrumb.items.terms-of-use.label',
      'global errors.codes.must_have_purchased',
      'global validation.required',
    ])
  })

  it('is deterministic, and its hash follows its content', () => {
    const again = buildTextCatalogue(TEXT_FIXTURE_SOURCE)

    expect(again).toEqual(fixture)
    expect(fixture.hash).toMatch(/^[0-9a-f]{16}$/)
    expect(buildTextCatalogue({ ...TEXT_FIXTURE_SOURCE, localeFiles: { el: ['el-GR.json'], en: ['en-US.json'] } }).hash)
      .not.toBe(fixture.hash)
  })
})

describe('views over the fixture tree', () => {
  it('lists, per store, the namespaces its components own, with the hash of that view entries', () => {
    expect(Object.keys(fixture.views)).toEqual(['default', 'ekfyseosfyteias', 'webside'])
    expect(fixture.views.webside!.namespaces).toEqual([
      'components/Cookie/Modal',
      'components/Demo/Greeting',
      'components/PageSection/Hero',
      'components/variants/webside/Chrome/Footer',
      'components/variants/webside/Product/PriorPrice',
      'components/variants/webside/Storefront/Home',
    ])
    expect(fixture.views.ekfyseosfyteias!.namespaces).toContain('components/PageSection/variants/ekfyseosfyteias/Hero')
    expect(fixture.views.ekfyseosfyteias!.namespaces).not.toContain('components/PageSection/Hero')
    expect(new Set(Object.values(fixture.views).map(({ hash }) => hash)).size).toBe(3)
  })

  it('files every component with texts under a view, so none is silently dropped', () => {
    const unrendered = fixture.entries.filter(({ namespace }) => !Object.values(fixture.views).some(view => view.namespaces.includes(namespace)) && namespace !== 'global')

    expect(unrendered).toEqual([])
    expect(fixture.entries.some(({ namespace }) => namespace === 'components/NoMessages')).toBe(false)
  })
})

describe('buildTextCatalogue over the real tree', () => {
  const real = buildTextCatalogue(REAL_TEXT_SOURCE)
  const find = (namespace: string, key: string) => real.entries.find(candidate => candidate.namespace === namespace && candidate.key === key)

  it('finds the component blocks and the global files', () => {
    // 4471 entries on 2026-10-28; a block the walk misses would be silent.
    expect(real.entries.length).toBeGreaterThan(4000)
    expect(find('components/Chrome/Footer', 'pay_with')?.defaults.en).toBe('Pay with')
    expect(find('components/variants/webside/Footer/Desktop', 'cookie_settings')).toBeDefined()
    expect(find('global', 'cancel')).toBeDefined()
  })

  it('gives each store with a design of its own a view, and the default store the shared tree', () => {
    expect(Object.keys(real.views)).toEqual(['default', 'ekfyseosfyteias', 'webside'])
    expect(real.views.webside!.namespaces).toContain('components/variants/webside/Footer/Desktop')
    expect(real.views.webside!.namespaces).not.toContain('components/Chrome/Footer')
    expect(real.views.default!.namespaces).toContain('components/Chrome/Footer')
    expect(real.views.default!.namespaces.filter(namespace => namespace.includes('variants/'))).toEqual([])
  })

  it('locks the Omnibus prior-price label', () => {
    expect(find('components/Product/PriorPrice', 'label')).toMatchObject({
      defaults: { el: 'Χαμηλότερη τιμή 30 ημερών πριν την έκπτωση' },
      locked: true,
    })
  })

  it('locks every text of the cookie and validation locale files', () => {
    for (const dir of ['cookies', 'validation']) {
      const file = join(REPO, LOCALE_FILES_DIR, dir, 'el-GR.json')
      const keys = [...flattenMessages(JSON.parse(readFileSync(file, 'utf8'))).keys()]

      expect(keys.length).toBeGreaterThan(0)
      expect(keys.filter(key => !find('global', key)?.locked)).toEqual([])
    }
  })

  it('locks every error code text', () => {
    const codes = real.entries.filter(({ namespace, key }) => namespace === 'global' && key.startsWith('errors.codes.'))

    expect(codes.length).toBeGreaterThan(0)
    expect(codes.filter(({ locked }) => !locked)).toEqual([])
  })

  it('locks the cookie components in every tree', () => {
    const cookieComponents = real.entries.filter(({ namespace }) => /(?:^|\/)(?:Cookie\/|CookieConsent$)/.test(namespace))

    expect(cookieComponents.length).toBeGreaterThan(0)
    expect(cookieComponents.filter(({ locked }) => !locked)).toEqual([])
  })

  it('reads every file of the locale directory, each under a locale', () => {
    const onDisk = readdirSync(join(REPO, LOCALE_FILES_DIR), { recursive: true, encoding: 'utf8' })
      .map(file => file.replaceAll('\\', '/'))
      .filter(file => file.endsWith('.json'))

    expect(Object.values(LOCALE_FILES).flat().sort()).toEqual(onDisk.sort())
  })
})
