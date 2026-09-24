import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { injectHead } from '@unhead/vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'

const { mockUseFetchFn } = vi.hoisted(() => ({
  mockUseFetchFn: vi.fn(),
}))

mockNuxtImport('useApi', () => mockUseFetchFn)

/**
 * Call the composable from inside a component's `setup()`.
 *
 * It reads the locale with `useI18n()`, which is only valid there —
 * that is where every page calls it from. Calling it bare from a test
 * used to throw "Must be called at the top of a `setup` function", and
 * the wrong fix for that was to change the composable to
 * `useNuxtApp().$i18n`: that is `undefined` outside the i18n module's
 * own setup plugin and 500'd every page render in production. The test
 * provides the context the composable requires instead.
 */
async function callUsePageConfig(pageType: string) {
  let result!: Awaited<ReturnType<typeof usePageConfig>>
  await mountSuspended(
    defineComponent({
      async setup() {
        result = await usePageConfig(pageType)
        return () => null
      },
    }),
  )
  return result
}

// A SHOP's homepage, in lockstep with DEFAULT_PAGE_LAYOUTS["home"] on
// the Django side. Every section is data-driven and renders nothing
// when its data or tenant flag is absent, so a store with no catalogue
// yet gets an empty page rather than a page of empty states.
const HOME_FALLBACK = [
  'product_categories',
  'featured_products',
  'products_slider',
  'recently_viewed',
  'blog_posts_grid',
  'newsletter_signup',
]

describe('usePageConfig', () => {
  beforeEach(() => {
    mockUseFetchFn.mockReset()
  })

  it('should return sections filtered by visibility and sorted', async () => {
    const sections = [
      { id: 3, uuid: 'c', componentType: 'spacer', title: '', isVisible: true, props: {}, sortOrder: 2 },
      { id: 1, uuid: 'a', componentType: 'hero_carousel', title: '', isVisible: true, props: {}, sortOrder: 0 },
      { id: 2, uuid: 'b', componentType: 'products_grid', title: '', isVisible: false, props: {}, sortOrder: 1 },
    ]

    mockUseFetchFn.mockReturnValue({
      data: ref({
        layout: {
          id: 1,
          uuid: 'layout-uuid',
          pageType: 'home',
          title: 'Homepage',
          isPublished: true,
          metadata: {},
          sections,
        },
      }),
      status: ref('success'),
      error: ref(null),
    })

    const { layout, sections: result } = await callUsePageConfig('home')

    expect(layout.value?.title).toBe('Homepage')
    expect(result.value).toHaveLength(2)
    expect(result.value![0]!.componentType).toBe('hero_carousel')
    expect(result.value![1]!.componentType).toBe('spacer')
  })

  it('should return the home fallback when the route reports no published layout', async () => {
    // The route answers `{ layout: null }` — data, not an error — when the
    // tenant has no published layout for the page type. That is the
    // documented normal state, so `error` stays null and callers that
    // 404 on an absent layout read `layout`, not `error`.
    mockUseFetchFn.mockReturnValue({
      data: ref({ layout: null }),
      status: ref('success'),
      error: ref(null),
    })

    const { layout, sections, error } = await callUsePageConfig('home')

    expect(layout.value).toBeNull()
    expect(error.value).toBeNull()
    expect(sections.value.map(s => s.componentType)).toEqual(HOME_FALLBACK)
  })

  it('should return the home fallback when the backend is unavailable', async () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(Object.assign(new Error('Service Unavailable'), { statusCode: 503 })),
    })

    const { layout, sections, error } = await callUsePageConfig('home')

    expect(layout.value).toBeNull()
    expect(error.value?.statusCode).toBe(503)
    expect(sections.value.map(s => s.componentType)).toEqual(HOME_FALLBACK)
  })

  it('should return empty array fallback for unknown page type', async () => {
    mockUseFetchFn.mockReturnValue({
      data: ref({ layout: null }),
      status: ref('success'),
      error: ref(null),
    })

    const { sections } = await callUsePageConfig('unknown-page')

    expect(sections.value).toEqual([])
  })

  it('should call useFetch with correct URL and key', async () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('pending'),
      error: ref(null),
    })

    await callUsePageConfig('products')

    expect(mockUseFetchFn).toHaveBeenCalledWith(
      '/api/page-config/products',
      expect.objectContaining({ key: expect.any(Function) }),
      expect.anything(),
    )
  })

  it('sends the locale and keys the payload on it', async () => {
    // Section titles and props are resolved per-locale by Django, so the
    // locale has to reach the route AND separate the payload keys —
    // sharing one key across locales served /en the Greek copy that the
    // default-locale route had already cached.
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('pending'),
      error: ref(null),
    })

    await callUsePageConfig('products')

    const options = mockUseFetchFn.mock.calls[0]![1] as {
      key: () => string
      query?: unknown
    }
    const locale = useNuxtApp().$i18n.locale.value
    expect(locale).toBeTruthy()
    expect(options.key()).toBe(`page-config-products-${locale}`)
    // The locale reaches the route in X-Language (useApi's hook), not
    // in a query the server no longer reads.
    expect(options.query).toBeUndefined()
  })

  describe('operator SEO', () => {
    const layoutWith = (seo: { seoTitle?: string, seoDescription?: string }) => ({
      data: ref({
        layout: {
          id: 7,
          uuid: 'about-uuid',
          pageType: 'about',
          title: 'About',
          isPublished: true,
          metadata: {},
          sections: [],
          ...seo,
        },
      }),
      status: ref('success'),
      error: ref(null),
    })

    /**
     * A page as the real ones are shaped: it awaits usePageConfig FIRST,
     * then registers its own code defaults — the order the operator's
     * values have to beat. The resolved head (deduped, as it renders)
     * is read back through unhead itself rather than the DOM, which the
     * test environment does not paint.
     */
    async function resolvedHead(defaults: { title: string, description: string }) {
      let head!: ReturnType<typeof injectHead>
      let before!: Set<number>
      const wrapper = await mountSuspended(
        defineComponent({
          async setup() {
            head = injectHead()
            before = new Set(head.entries.keys())
            await usePageConfig('about')
            useSeoMeta({ title: defaults.title, description: defaults.description })
            return () => null
          },
        }),
      )
      // Paint the head and read it back deduped and weighted exactly as
      // a browser sees it. unhead 3's client renderer queues the DOM
      // write, so the paint lands on the next macrotask.
      const paint = async () => {
        head.render()
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      await paint()
      const painted = {
        title: document.title,
        description: document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content'),
      }
      // The head is shared by the file's Nuxt app and mountSuspended's
      // wrapper does not dispose a suspended child's entries on
      // unmount: drop the entries THIS page registered and repaint so
      // the next test starts clean.
      wrapper.unmount()
      for (const key of head.entries.keys()) {
        if (!before.has(key)) head.entries.delete(key)
      }
      await paint()
      return painted
    }

    it('wins over the page defaults registered after it', async () => {
      mockUseFetchFn.mockReturnValue(layoutWith({
        seoTitle: 'Τι Είναι Το Webside | Μπες στο side της τεχνολογίας',
        seoDescription: 'Ποιοι είμαστε, τι κάνουμε και γιατί το κάνουμε.',
      }))

      const head = await resolvedHead({ title: 'Code default', description: 'Code default description' })

      expect(head.title).toContain('Τι Είναι Το Webside | Μπες στο side της τεχνολογίας')
      expect(head.title).not.toContain('Code default')
      expect(head.description).toBe('Ποιοι είμαστε, τι κάνουμε και γιατί το κάνουμε.')
    })

    it('applies the SEO Django resolved for the locale it asked for', async () => {
      // page-config answers ONE locale per request, SEO included, so the
      // head must carry whatever the request's own locale got back.
      const byLocale: Record<string, { seoTitle: string, seoDescription: string }> = {
        el: { seoTitle: 'Σχετικά με εμάς', seoDescription: 'Ποιοι είμαστε.' },
        en: { seoTitle: 'About us', seoDescription: 'Who we are.' },
      }
      let asked = ''
      mockUseFetchFn.mockImplementation((_url: unknown, options: { key: () => string }) => {
        asked = options.key().split('-').pop() ?? ''
        return layoutWith(byLocale[asked] ?? { seoTitle: '', seoDescription: '' })
      })

      const head = await resolvedHead({ title: 'Code default', description: 'Code default description' })

      expect(byLocale[asked]).toBeDefined()
      expect(head.title).toContain(byLocale[asked]!.seoTitle)
      expect(head.description).toBe(byLocale[asked]!.seoDescription)
    })

    it('leaves the page defaults in place when the layout carries no SEO', async () => {
      mockUseFetchFn.mockReturnValue(layoutWith({ seoTitle: '', seoDescription: '' }))

      const head = await resolvedHead({ title: 'Code default', description: 'Code default description' })

      expect(head.title).toContain('Code default')
      expect(head.description).toBe('Code default description')
    })
  })
})
