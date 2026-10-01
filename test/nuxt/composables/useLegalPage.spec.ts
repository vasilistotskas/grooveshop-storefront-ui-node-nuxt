import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A legal document is the tenant's own ContentPage, in whichever
 * language it EXISTS in.
 *
 * A page that exists but not in the visitor's language is not absent:
 * a 404 there told an English-speaking customer the store's terms did
 * not exist, which was false and left them no route to the terms. So the
 * body is resolved through the tenant's default locale and then the
 * rest it serves, the title follows the body's locale, and the reader is
 * told which language they are reading — named in THEIR language.
 *
 * The harness renders in `el`, the platform default; the tenant below
 * serves `el` and `en`.
 */
type Translations = Record<string, { title?: string, body?: string }>

let page: { slug: string, translations: Translations, updatedAt: string } | null = null

const { declare } = vi.hoisted(() => ({ declare: vi.fn() }))

mockNuxtImport('useDocumentLocales', () => () => ({ declare }))

registerEndpoint('/api/content-pages/terms', () => ({ page }))

const withTranslations = (translations: Translations) => ({
  slug: 'terms',
  translations,
  updatedAt: '2026-09-01T10:00:00Z',
})

/** `useI18n` needs a component instance, so run the composable in one. */
async function legalPage() {
  let legal!: Awaited<ReturnType<typeof useLegalPage>>
  await mountSuspended(defineComponent({
    async setup() {
      legal = await useLegalPage('terms-of-use')
      return () => null
    },
  }), { route: false })
  return legal
}

beforeEach(() => {
  page = null
  setTenant({ defaultLocale: 'el', availableLocales: ['el', 'en'] })
  clearNuxtData('legal-page-terms')
})

describe('useLegalPage', () => {
  it('renders the document in the reader\'s language when it exists there', async () => {
    page = withTranslations({
      el: { title: 'Όροι χρήσης', body: '<h2>Γενικά</h2><p>Κείμενο</p>' },
      en: { title: 'Terms', body: '<p>Text</p>' },
    })

    const legal = await legalPage()

    expect(legal.hasDocument.value).toBe(true)
    expect(legal.isFallback.value).toBe(false)
    expect(legal.fallbackLanguageName.value).toBe('')
    expect(legal.documentLocale.value).toBe('el')
    expect(legal.title.value).toBe('Όροι χρήσης')
    expect(legal.updatedAt.value).toBe('2026-09-01T10:00:00Z')
    // The contents come from the document: the heading gets an anchor.
    expect(legal.tocLinks.value).toEqual([{ id: 'section-1', text: 'Γενικά' }])
    expect(legal.body.value).toContain('<h2 id="section-1">Γενικά</h2>')
  })

  it('falls back to the language the document exists in, and names it in the reader\'s', async () => {
    // Body only in English, title only in Greek: the body decides the
    // locale, and the title chain still finds a title to show.
    page = withTranslations({
      el: { title: 'Όροι χρήσης', body: '' },
      en: { body: '<p>Text</p>' },
    })

    const legal = await legalPage()

    expect(legal.hasDocument.value).toBe(true)
    expect(legal.isFallback.value).toBe(true)
    expect(legal.documentLocale.value).toBe('en')
    expect(legal.fallbackLanguageName.value).toBe(new Intl.DisplayNames(['el'], { type: 'language' }).of('en'))
    expect(legal.title.value).toBe('Όροι χρήσης')
    expect(legal.body.value).toBe('<p>Text</p>')
  })

  it('names the language by its code when the runtime cannot', async () => {
    // `Intl.DisplayNames#of` throws on a malformed code.
    page = withTranslations({ 'x!': { title: 'T', body: '<p>b</p>' } })

    const legal = await legalPage()

    expect(legal.documentLocale.value).toBe('x!')
    expect(legal.fallbackLanguageName.value).toBe('x!')
  })

  it('tells the head pipeline which locales the document is written in', async () => {
    // An `en` row saved with an empty body is no English document: no
    // `en` hreflang, and the English page's canonical points at `el`.
    page = withTranslations({
      el: { title: 'Όροι', body: '<p>κείμενο</p>' },
      en: { title: 'Terms', body: '<p></p>' },
    })

    await legalPage()

    expect(declare).toHaveBeenCalledWith(['el'])
  })

  it.each([
    ['no page at the slug', null],
    ['a page with an empty body everywhere', withTranslations({ el: { title: 'Όροι', body: '' } })],
  ])('has no document for %s', async (_case, published) => {
    page = published

    const legal = await legalPage()

    expect(legal.hasDocument.value).toBe(false)
    expect(legal.title.value).toBe(published ? 'Όροι' : '')
  })

  it('declares nothing when there is no page', async () => {
    await legalPage()

    expect(declare).not.toHaveBeenCalled()
  })
})
