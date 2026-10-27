import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, onErrorCaptured } from 'vue'
import Info from '~/components/Storefront/Info.vue'
import WebsideInfo from '~/components/variants/webside/Storefront/Info.vue'
import { injectHead } from '#imports'
import { setTenant } from '~~/test/helpers/tenant'
import { makeContentPage } from '~~/test/fixtures/contentPage'
import type { ContentPageDetail } from '~~/shared/openapi/types.gen'
import { failWith } from '~~/test/helpers/api'

/**
 * `/info/[slug]` renders a CMS content page. Its status is the
 * contract: an absent page (`{ page: null }`, or a 404) is a 404, an
 * upstream failure is a 503 (temporary for crawlers), and a slug that
 * has its own legal route 301s there so one document has one URL.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { route, navigateToMock } = vi.hoisted(() => ({
  route: { params: { slug: 'shipping' } as Record<string, string> },
  navigateToMock: vi.fn(),
}))
mockNuxtImport('useRoute', () => () => ({
  params: route.params,
  query: {},
  path: `/info/${route.params.slug}`,
  fullPath: `/info/${route.params.slug}`,
  name: 'info-slug___el',
  hash: '',
  matched: [],
  meta: {},
}))
mockNuxtImport('navigateTo', () => navigateToMock)
const { declare } = vi.hoisted(() => ({ declare: vi.fn() }))
mockNuxtImport('useDocumentLocales', () => () => ({ declare }))

/** A content page as `/api/content-pages/<slug>` serves it. */
function page(slug: string, translations: ContentPageDetail['translations']) {
  return makeContentPage({ slug, translations })
}

describe.each([
  ['default', Info],
  ['webside', WebsideInfo],
])('Info (%s tree)', (_tree, Component) => {
  /** The first error the body's setup throws (captured as Nuxt would), else its text. */
  async function render(): Promise<{ error: unknown, text: string }> {
    let error: unknown
    const Parent = defineComponent({
      setup() {
        onErrorCaptured((thrown) => {
          error ??= thrown
          return false
        })
        return () => h(Component)
      },
    })
    const wrapper = await mountSuspended(Parent, { route: false })
    await flushPromises()
    const text = error ? '' : wrapper.text()
    wrapper.unmount()
    return { error, text }
  }

  /**
   * The meta description the page paints, read off the real head (the
   * build rewrites a `useSeoMeta` beside a `useHead` into one
   * `useHead`, so a mock of either names an implementation detail).
   */
  async function description(): Promise<string | null> {
    const head = injectHead()
    const before = new Set(head.entries.keys())
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      head.render()
      vi.runOnlyPendingTimers()
    }
    finally {
      vi.useRealTimers()
    }
    const content = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null
    wrapper.unmount()
    for (const key of head.entries.keys()) {
      if (!before.has(key)) head.entries.delete(key)
    }
    return content
  }

  beforeEach(() => {
    clearNuxtData()
    setTenant({ defaultLocale: 'el', availableLocales: ['el'] })
    route.params = { slug: 'shipping' }
  })

  it('renders the published page', async () => {
    api.routes({
      '/api/content-pages/shipping': { page: page('shipping', { el: { title: 'Αποστολές', body: '<p>Κείμενο αποστολών</p>' } }) },
    })

    const { error, text } = await render()

    expect(error).toBeUndefined()
    expect(text).toContain('Αποστολές')
  })

  it.each([[500], [502], [503]])('answers 503 when the upstream fails with %s', async (statusCode) => {
    api.routes({ '/api/content-pages/shipping': failWith(statusCode) })

    expect((await render()).error).toMatchObject({ statusCode: 503 })
  })

  it('answers 404 when the upstream has no such page', async () => {
    api.routes({ '/api/content-pages/shipping': failWith(404) })

    expect((await render()).error).toMatchObject({ statusCode: 404 })
  })

  it('answers 404 for the route\'s "no published page" answer', async () => {
    api.routes({ '/api/content-pages/shipping': { page: null } })

    expect((await render()).error).toMatchObject({ statusCode: 404 })
  })

  it('answers 404 for a page with no body in any language it could show', async () => {
    api.routes({ '/api/content-pages/shipping': { page: page('shipping', { el: { title: 'Κενό', body: '' } }) } })

    expect((await render()).error).toMatchObject({ statusCode: 404 })
  })

  it('tells the head pipeline only the locales the page is written in', async () => {
    // An `en` key saved with an empty body is no English page.
    api.routes({
      '/api/content-pages/shipping': {
        page: page('shipping', {
          el: { title: 'Αποστολή', body: '<p>κείμενο</p>' },
          en: { title: 'Shipping', body: '<p></p>' },
        }),
      },
    })

    await render()

    expect(declare).toHaveBeenCalledWith(['el'])
  })

  it('describes the page by its own description, else by the opening of its body', async () => {
    const content = { el: { title: 'Αποστολές', body: '<p>Στέλνουμε σε όλη την Ελλάδα σε δύο εργάσιμες.</p>' } }
    api.routes({ '/api/content-pages/shipping': { page: page('shipping', { el: { ...content.el, seoDescription: 'Η δική μας περιγραφή' } }) } })
    expect(await description()).toBe('Η δική μας περιγραφή')

    clearNuxtData()
    api.routes({ '/api/content-pages/shipping': { page: page('shipping', content) } })
    expect(await description()).toContain('Στέλνουμε σε όλη την Ελλάδα')
  })

  it('301s a legal slug to its dedicated route', async () => {
    route.params = { slug: 'privacy' }
    api.routes({ '/api/content-pages/privacy': { page: page('privacy', { el: { title: 'Απόρρητο', body: '<p>x</p>' } }) } })

    await render()

    expect(navigateToMock).toHaveBeenCalledWith('/privacy-policy', { redirectCode: 301, replace: true })
  })
})
