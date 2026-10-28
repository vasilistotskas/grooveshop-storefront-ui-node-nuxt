import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import textOverridesPlugin from '~/plugins/text-overrides'
import { failWith } from '~~/test/helpers/api'

/**
 * A store's edited texts reach the GLOBAL composer from the plugin:
 * the page locale's on setup, and every locale a language switch loads.
 * (A component's own `<i18n>` texts are `useStoreI18n`'s.)
 *
 * The Nuxt app is shared by the file, so the plugin runs here with the
 * hooks it registers taken off again, the composer methods it wraps put
 * back, and every text a test changes restored.
 */
const { api, bootApi } = await vi.hoisted(async () => {
  const { createApiMock } = await import('~~/test/helpers/api')
  return { api: createApiMock(), bootApi: createApiMock() }
})
// The app's own boot runs this plugin once, before any test: it gets its
// own fetcher, so its hooks (still registered) never answer for the plugin
// a test runs.
let fetchers = 0
mockNuxtImport('useRequestApi', () => () => (fetchers++ === 0 ? bootApi : api))

const URL = '/api/texts/overrides'
const FAVOURITES = { el: 'Αγαπημένα', en: 'Favourites' }

const run = (nuxtApp = useNuxtApp()) => (textOverridesPlugin as unknown as (app: typeof nuxtApp) => Promise<void>)(nuxtApp)
const global = () => useNuxtApp().$i18n
const overrides = () => useTextOverrides()

let offHooks: Array<() => void> = []
let originals: Pick<ReturnType<typeof global>, 'mergeLocaleMessage' | 'setLocaleMessage'>

beforeEach(() => {
  originals = { mergeLocaleMessage: global().mergeLocaleMessage, setLocaleMessage: global().setLocaleMessage }
  const nuxtApp = useNuxtApp()
  const hook = nuxtApp.hook.bind(nuxtApp)
  vi.spyOn(nuxtApp, 'hook').mockImplementation(((name: string, callback: never) => {
    const off = hook(name as never, callback)
    offHooks.push(off)
    return off
  }) as typeof nuxtApp.hook)
  // The shared app may not have English loaded: give the keys a default to override.
  global().mergeLocaleMessage('en', { favourites: FAVOURITES.en })
})

afterEach(() => {
  for (const off of offHooks) off()
  offHooks = []
  // The plugin wraps the composer's loaders; a test's run must not stack on the next.
  Object.assign(global(), originals)
  overrides().value = undefined
  useNuxtApp().payload.serverRendered = false
  for (const locale of ['el', 'en'] as const) global().mergeLocaleMessage(locale, { favourites: FAVOURITES[locale] })
})

describe('text-overrides plugin', () => {
  it('asks for the page locale and merges the store\'s global texts over the defaults', async () => {
    api.routes({ [URL]: { 'global': { favourites: 'Τα αγαπημένα μου' }, 'components/Chrome/Footer': { tagline: 'Δική μας' } } })

    await run()

    expect(api.callsTo(URL)).toEqual([{ url: URL, options: { query: { language: 'el' } } }])
    expect(global().t('favourites')).toBe('Τα αγαπημένα μου')
    // The other texts are the defaults.
    expect(global().t('loyalty')).toBe('Πρόγραμμα Επιβράβευσης')
  })

  it('keeps every namespace for the components that merge their own', async () => {
    const fetched = { 'global': { favourites: 'Τα αγαπημένα μου' }, 'components/Chrome/Footer': { tagline: 'Δική μας' } }
    api.routes({ [URL]: fetched })

    await run()

    expect(overrides().value).toEqual({ el: fetched })
  })

  it('does not replace a locked text, nor add a key the build does not have', async () => {
    api.routes({ [URL]: { global: { 'validation.min': 'Hacked', 'no.such.key': 'x', 'favourites': 'Τα αγαπημένα μου' } } })
    const locked = global().t('validation.min', { min: 3 })

    await run()

    expect(global().t('validation.min', { min: 3 })).toBe(locked)
    expect(global().te('no.such.key')).toBe(false)
    expect(global().t('favourites')).toBe('Τα αγαπημένα μου')
  })

  it('leaves the payload alone for a store without overrides', async () => {
    api.routes({ [URL]: {} })

    await run()

    expect(overrides().value).toBeUndefined()
    expect(global().t('favourites')).toBe(FAVOURITES.el)
  })

  it('asks for nothing the server already sent: the payload carries the page locale\'s texts', async () => {
    useNuxtApp().payload.serverRendered = true
    overrides().value = { el: { global: { favourites: 'Από το payload' } } }

    await run()

    expect(api.callsTo(URL)).toEqual([])
    expect(global().t('favourites')).toBe('Από το payload')
  })

  describe('on a language switch', () => {
    const beforeSwitch = async (newLocale: string, oldLocale = 'el') => {
      const nuxtApp = useNuxtApp()
      await nuxtApp.callHook('i18n:beforeLocaleSwitch', { newLocale, oldLocale, initialSetup: false, context: nuxtApp } as never)
    }

    it('loads the new language once, while the page is still in the old one', async () => {
      api.routes({ [URL]: {} })
      await run()
      api.routes({ [URL]: { 'global': { favourites: 'My favourites' }, 'components/Chrome/Footer': { tagline: 'Ours' } } })

      await beforeSwitch('en')

      expect(api.callsTo(URL).map(({ options }) => options.query.language)).toEqual(['el', 'en'])
      // Waiting in the state for the components that merge their own...
      expect(overrides().value?.en?.['components/Chrome/Footer']).toEqual({ tagline: 'Ours' })
      // ...and merged over the English defaults once the module has loaded them.
      expect(global().t('favourites', {}, { locale: 'en' })).toBe('My favourites')
      expect(global().t('favourites', {}, { locale: 'el' })).toBe(FAVOURITES.el)
    })

    it('does not ask again for a language it has', async () => {
      api.routes({ [URL]: { global: { favourites: 'My favourites' } } })
      await run()

      await beforeSwitch('en')
      await beforeSwitch('el', 'en')
      await beforeSwitch('en')

      expect(api.callsTo(URL).map(({ options }) => options.query.language)).toEqual(['el', 'en'])
    })

    it('keeps the defaults when the texts cannot be loaded, and tries again next time', async () => {
      api.routes({ [URL]: {} })
      await run()
      api.routes({ [URL]: failWith(502) })

      await expect(beforeSwitch('en')).resolves.toBeUndefined()
      expect(global().t('favourites', {}, { locale: 'en' })).toBe(FAVOURITES.en)

      api.routes({ [URL]: { global: { favourites: 'My favourites' } } })
      await beforeSwitch('en')
      expect(global().t('favourites', {}, { locale: 'en' })).toBe('My favourites')
    })
  })

  // @nuxtjs/i18n merges a locale's messages into the global composer again
  // around every switch, in an order of its own: each load puts the
  // defaults back over what was merged before.
  describe('when the module loads the messages of a locale again', () => {
    beforeEach(async () => {
      api.routes({ [URL]: { global: { favourites: 'Τα αγαπημένα μου' } } })
      await run()
    })

    it('puts the text of the store back over a merged default', () => {
      global().mergeLocaleMessage('el', { favourites: FAVOURITES.el, loyalty: 'Επιβράβευση' })

      expect(global().t('favourites')).toBe('Τα αγαπημένα μου')
      // The same load still lands for every other text.
      expect(global().t('loyalty')).toBe('Επιβράβευση')
    })

    it('puts the text of the store back over a replaced locale', () => {
      global().setLocaleMessage('el', { favourites: FAVOURITES.el })

      expect(global().t('favourites')).toBe('Τα αγαπημένα μου')
    })

    it('leaves the other locale as that load wrote it', () => {
      global().mergeLocaleMessage('en', { favourites: 'Loaded' })

      expect(global().t('favourites', {}, { locale: 'en' })).toBe('Loaded')
    })
  })
})
