import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, onErrorCaptured } from 'vue'
import { resolve } from 'node:path'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import StorefrontLegal from '~/components/Storefront/Legal.vue'

/**
 * The body of the four legal routes renders the tenant's own document,
 * and nothing else.
 *
 * It used to ship the platform's Greek legal text as a fallback: two
 * render paths, of which only the boilerplate one was ever exercised, so
 * the merchant path shipped a duplicate `h1` and a table of contents
 * anchored to ids that existed solely in the boilerplate — both live on
 * tenant #2's `/privacy-policy`. Now an absent document is a 404 and an
 * outage a 503: an empty article with HTTP 200 is a soft-404 on a page
 * the footer links from every other page of the store.
 *
 * `useLegalPage` (tested on its own) is mocked, so what is asserted here
 * is what the body does with each of its answers.
 */
const { legalPage } = vi.hoisted(() => ({ legalPage: vi.fn() }))

mockNuxtImport('useLegalPage', () => legalPage)

function document(overrides: Record<string, unknown> = {}) {
  const values = {
    title: 'Πολιτική απορρήτου',
    body: '<h2 id="data">Δεδομένα</h2><p>Κείμενο</p>',
    tocLinks: [{ id: 'data', text: 'Δεδομένα' }],
    updatedAt: '2026-09-01T10:00:00Z',
    hasDocument: true,
    error: null,
    documentLocale: 'el',
    isFallback: false,
    fallbackLanguageName: '',
    ...overrides,
  }
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, ref(value)]))
}

const mountLegal = () => mountSuspended(StorefrontLegal, { props: { route: 'privacy-policy' }, route: false })

/**
 * The error the body throws from setup, as Nuxt's error page would get
 * it. Caught by a parent so it does not escape the test: Vue still runs
 * the failed component's render afterwards, and that second error is
 * the harness's, not the page's.
 */
async function thrownBy() {
  const errors: unknown[] = []
  await mountSuspended(defineComponent({
    setup() {
      onErrorCaptured((error) => {
        errors.push(error)
        return false
      })
      return () => h(StorefrontLegal, { route: 'privacy-policy' })
    },
  }), { route: false })
  await flushPromises()
  return errors[0]
}

describe('StorefrontLegal', () => {
  it('asks for the document of the route it was handed', async () => {
    legalPage.mockResolvedValue(document())

    await mountLegal()

    expect(legalPage).toHaveBeenCalledWith('privacy-policy')
  })

  it('renders the document once, under a single heading, with its own contents', async () => {
    legalPage.mockResolvedValue(document())

    const wrapper = await mountLegal()

    expect(wrapper.findAll('h1').map(h => h.text())).toEqual(['Πολιτική απορρήτου'])
    const article = wrapper.find('article')
    expect(article.attributes('lang')).toBe('el')
    expect(article.html()).toContain('<h2 id="data">Δεδομένα</h2>')
    expect(wrapper.findAll('a[href="#data"]').length).toBeGreaterThan(0)
    const { t } = useNuxtApp().$i18n
    expect(wrapper.text()).toContain(t('breadcrumb.items.privacy-policy.label'))
  })

  it('marks a document shown in another language, and says which', async () => {
    legalPage.mockResolvedValue(document({ isFallback: true, documentLocale: 'en', fallbackLanguageName: 'Αγγλικά' }))

    const wrapper = await mountLegal()

    expect(wrapper.find('article').attributes('lang')).toBe('en')
    expect(wrapper.text()).toContain('Αγγλικά')
  })

  it('shows no language notice for a document in the reader\'s language', async () => {
    // Same name handed over, but no fallback: the notice is gated on
    // `isFallback`, not on having a language name.
    legalPage.mockResolvedValue(document({ fallbackLanguageName: 'Αγγλικά' }))

    const wrapper = await mountLegal()

    expect(wrapper.text()).not.toContain('Αγγλικά')
  })

  it.each([
    ['there is no document', { hasDocument: false }, 404],
    ['the API answered 404', { error: { statusCode: 404 } }, 404],
    ['the API is down', { error: { statusCode: 502 } }, 503],
  ])('fails with %s → %i instead of rendering an empty page', async (_case, overrides, statusCode) => {
    legalPage.mockResolvedValue(document({ hasDocument: !('hasDocument' in overrides), ...overrides }))

    expect(await thrownBy()).toMatchObject({ statusCode })
  })

  it('dates the document, and describes it, under its one heading', async () => {
    legalPage.mockResolvedValue(document())

    const wrapper = await mountLegal()

    const date = new Date('2026-09-01T10:00:00Z').toLocaleDateString('el', { day: 'numeric', month: 'long', year: 'numeric' })
    expect(wrapper.get('header').text()).toContain(`Τελευταία ενημέρωση: ${date}`)
    expect(wrapper.get('header p').text()).toBe('Πώς συλλέγουμε, χρησιμοποιούμε και προστατεύουμε τα προσωπικά σας δεδομένα.')
  })

  it('shows no date for a document that has none', async () => {
    legalPage.mockResolvedValue(document({ updatedAt: null }))

    const wrapper = await mountLegal()

    expect(wrapper.text()).not.toContain('Τελευταία ενημέρωση')
  })

  it('sets the document in its own prose, not the shared article class', async () => {
    legalPage.mockResolvedValue(document())

    const wrapper = await mountLegal()

    expect(wrapper.find('article.legal-prose').exists()).toBe(true)
    expect(wrapper.find('.article').exists()).toBe(false)
  })

  it('puts the contents list ahead of the text, and none for a document without headings', async () => {
    legalPage.mockResolvedValue(document())
    const withHeadings = await mountLegal()
    const html = withHeadings.html()
    expect(html.indexOf('<nav')).toBeGreaterThan(-1)
    expect(html.indexOf('legal-prose')).toBeGreaterThan(html.indexOf('aria-label="Σε αυτή τη σελίδα"'))

    legalPage.mockResolvedValue(document({ tocLinks: [] }))
    const flat = await mountLegal()
    expect(flat.find('nav[aria-label="Σε αυτή τη σελίδα"]').exists()).toBe(false)
  })

  it('keeps every anchor the contents list can land on clear of the sticky header', () => {
    // CSS is not rendered in happy-dom, so the rule itself is the contract.
    const css = parseSfc(resolve(REPO, 'app/components/Storefront/Legal.vue')).styles.map(style => style.content).join('\n')

    for (const target of [':deep(h2)', ':deep(h3)', ':deep(section[id])']) {
      const rule = css.split('}').find(block => block.includes(`.legal-prose ${target}`))
      expect(rule, target).toMatch(/scroll-margin-top:\s*7rem/)
    }
  })
})
