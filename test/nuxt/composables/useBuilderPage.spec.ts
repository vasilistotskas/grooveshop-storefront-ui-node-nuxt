import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { injectHead } from '#imports'

const { mockUseFetchFn } = vi.hoisted(() => ({
  mockUseFetchFn: vi.fn(),
}))

mockNuxtImport('useApi', () => mockUseFetchFn)

/**
 * Call the composable from inside a component's `setup()`.
 *
 * It reads the locale with `useI18n()`, which is only valid there: that is
 * where every page calls it from. Calling it bare from a test throws "Must be
 * called at the top of a `setup` function", and the wrong fix for that is to
 * change the composable to `useNuxtApp().$i18n`, which is `undefined` outside
 * the i18n module's own setup plugin and would 500 every page render. The
 * test provides the context the composable requires instead.
 */
async function callUseBuilderPage(pageKey: string, options?: { placement?: 'top' | 'below-content' }) {
  let result!: Awaited<ReturnType<typeof useBuilderPage>>
  await mountSuspended(
    defineComponent({
      async setup() {
        result = await useBuilderPage(pageKey, options)
        return () => null
      },
    }),
  )
  return result
}

const answer = (page: BuilderPage | null) => ({
  data: ref<BuilderPageResponse>({ page }),
  status: ref('success'),
  error: ref(null),
})

describe('useBuilderPage', () => {
  beforeEach(() => {
    mockUseFetchFn.mockReset()
  })

  it('gives the sections of the published page as the route answered them, in that order', async () => {
    mockUseFetchFn.mockReturnValue(answer({
      sections: [
        { id: 'a', componentType: 'hero_carousel', props: {} },
        { id: 'b', componentType: 'spacer', props: { height: 'lg' } },
      ],
    }))

    const { page, sections } = await callUseBuilderPage('home')

    expect(page.value).not.toBeNull()
    expect(sections.value.map(section => section.componentType)).toEqual(['hero_carousel', 'spacer'])
    expect(sections.value[1]!.props).toEqual({ height: 'lg' })
  })

  it('has no page and no error when the store has not built it, which is a normal state', async () => {
    // The route answers `{ page: null }`, data and not an error, for a page
    // key the release does not have. Callers that 404 on an unbuilt page read
    // `page`, callers that tell an outage apart read `error`.
    mockUseFetchFn.mockReturnValue(answer(null))

    const { page, sections, error } = await callUseBuilderPage('products')

    expect(page.value).toBeNull()
    expect(sections.value).toEqual([])
    expect(error.value).toBeNull()
  })

  it('renders nothing, with the error set, when the backend is unavailable', async () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(Object.assign(new Error('Service Unavailable'), { statusCode: 503 })),
    })

    const { page, sections, error } = await callUseBuilderPage('home')

    expect(page.value).toBeNull()
    expect(sections.value).toEqual([])
    expect(error.value?.statusCode).toBe(503)
  })

  it('requests the route of its own page key', async () => {
    mockUseFetchFn.mockReturnValue({ data: ref(null), status: ref('pending'), error: ref(null) })

    await callUseBuilderPage('products')

    expect(mockUseFetchFn.mock.calls[0]![0]).toBe('/api/builder/pages/products')
  })

  it('sends the locale and keys the payload on it', async () => {
    // The page's props are resolved per language by Django, so the language
    // has to reach the route AND separate the payload keys: sharing one key
    // across languages served /en the Greek copy the default-language route
    // had already cached.
    mockUseFetchFn.mockReturnValue({ data: ref(null), status: ref('pending'), error: ref(null) })

    await callUseBuilderPage('products')

    const options = mockUseFetchFn.mock.calls[0]![1] as { key: () => string, query?: unknown }
    const locale = useNuxtApp().$i18n.locale.value
    expect(locale).toBeTruthy()
    expect(options.key()).toBe(`builder-page-products-${locale}`)
    // The locale reaches the route in X-Language (useApi's hook), not in a
    // query the server no longer reads.
    expect(options.query).toBeUndefined()
  })

  describe('operator SEO', () => {
    const pageWith = (settings: Record<string, unknown> | undefined) => answer({ ...(settings && { settings }), sections: [] })

    /**
     * A page as the real ones are shaped: it awaits useBuilderPage FIRST, then
     * registers its own code defaults, the order the operator's values have to
     * beat. The resolved head (deduped, as it renders) is read back through
     * unhead itself rather than the DOM, which the test environment does not
     * paint.
     */
    async function resolvedHead(
      defaults: { title: string, description: string },
      options: { placement?: 'top' | 'below-content' } = {},
    ) {
      let head!: ReturnType<typeof injectHead>
      let before!: Set<number>
      const wrapper = await mountSuspended(
        defineComponent({
          async setup() {
            head = injectHead()
            before = new Set(head.entries.keys())
            await useBuilderPage('about', options)
            useSeoMeta({ title: defaults.title, description: defaults.description })
            return () => null
          },
        }),
      )
      // Paint the head and read it back deduped and weighted exactly as a
      // browser sees it. unhead 3's Vue client renderer defers the DOM write
      // to a `setTimeout(0)` (`@unhead/vue/client` createHead), so the paint
      // runs that one timer on a fake clock.
      const paint = () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] })
        try {
          head.render()
          vi.runOnlyPendingTimers()
        }
        finally {
          vi.useRealTimers()
        }
      }
      paint()
      const painted = {
        title: document.title,
        description: document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content'),
      }
      // The head is shared by the file's Nuxt app and mountSuspended's wrapper
      // does not dispose a suspended child's entries on unmount: drop the
      // entries THIS page registered and repaint so the next test starts clean.
      wrapper.unmount()
      for (const key of head.entries.keys()) {
        if (!before.has(key)) head.entries.delete(key)
      }
      paint()
      return painted
    }

    it('wins over the page defaults registered after it', async () => {
      mockUseFetchFn.mockReturnValue(pageWith({
        seoTitle: 'Τι Είναι Το Webside | Μπες στο side της τεχνολογίας',
        seoDescription: 'Ποιοι είμαστε, τι κάνουμε και γιατί το κάνουμε.',
      }))

      const head = await resolvedHead({ title: 'Code default', description: 'Code default description' })

      expect(head.title).toContain('Τι Είναι Το Webside | Μπες στο side της τεχνολογίας')
      expect(head.title).not.toContain('Code default')
      expect(head.description).toBe('Ποιοι είμαστε, τι κάνουμε και γιατί το κάνουμε.')
    })

    it('does not speak for a page it is only bands under', async () => {
      // The blog-post page is drawn under each article: its SEO fields must
      // not replace the article's own title and description.
      mockUseFetchFn.mockReturnValue(pageWith({ seoTitle: 'Page title', seoDescription: 'Page description' }))

      const head = await resolvedHead({ title: 'Article title', description: 'Article description' }, { placement: 'below-content' })

      expect(head.title).toContain('Article title')
      expect(head.title).not.toContain('Page title')
      expect(head.description).toBe('Article description')
    })

    it('applies the SEO Django resolved for the locale it asked for', async () => {
      // The published read answers ONE locale per request, SEO included, so
      // the head must carry whatever the request's own locale got back.
      const byLocale: Record<string, { seoTitle: string, seoDescription: string }> = {
        el: { seoTitle: 'Σχετικά με εμάς', seoDescription: 'Ποιοι είμαστε.' },
        en: { seoTitle: 'About us', seoDescription: 'Who we are.' },
      }
      let asked = ''
      mockUseFetchFn.mockImplementation((_url: unknown, options: { key: () => string }) => {
        asked = options.key().split('-').pop() ?? ''
        return pageWith(byLocale[asked])
      })

      const head = await resolvedHead({ title: 'Code default', description: 'Code default description' })

      // The harness pins the platform default locale (vitest.config.mts).
      expect(asked).toBe('el')
      expect(head.title).toContain(byLocale[asked]!.seoTitle)
      expect(head.description).toBe(byLocale[asked]!.seoDescription)
    })

    it.each([
      ['no settings', undefined],
      ['empty settings', {}],
      ['empty strings', { seoTitle: '', seoDescription: '' }],
      ['values that are not text', { seoTitle: 5, seoDescription: null }],
    ])('leaves the page defaults in place for %s', async (_, settings) => {
      mockUseFetchFn.mockReturnValue(pageWith(settings))

      const head = await resolvedHead({ title: 'Code default', description: 'Code default description' })

      expect(head.title).toContain('Code default')
      expect(head.description).toBe('Code default description')
    })

    it('gives a page its own title and description for its callers to use', async () => {
      mockUseFetchFn.mockReturnValue(pageWith({ seoTitle: 'About us', seoDescription: 'Who we are.' }))

      const { seoTitle, seoDescription } = await callUseBuilderPage('about')

      expect(seoTitle.value).toBe('About us')
      expect(seoDescription.value).toBe('Who we are.')
    })
  })
})
