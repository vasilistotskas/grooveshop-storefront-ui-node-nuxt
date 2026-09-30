import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, onErrorCaptured, ref } from 'vue'
import CustomPage from '~/components/Storefront/CustomPage.vue'
import WebsideCustomPage from '~/components/variants/webside/Storefront/CustomPage.vue'

/**
 * The catch-all `/[slug]` page renders a published page layout, and
 * its status is what crawlers see: no published layout is a 404 (the
 * page does not exist), while an upstream failure is a 503 — temporary,
 * so a backend blip never de-indexes a live page, and retryable by
 * error.vue's one-shot reload.
 */
const { route, pageConfig } = vi.hoisted(() => ({
  route: { params: { slug: 'our-story' } as Record<string, string> },
  pageConfig: {
    layout: null as null | { isPublished: boolean, title: string },
    error: null as null | { statusCode: number },
    slugs: [] as string[],
  },
}))

mockNuxtImport('useRoute', () => () => ({
  params: route.params,
  query: {},
  path: `/${route.params.slug ?? ''}`,
  fullPath: `/${route.params.slug ?? ''}`,
  name: 'slug___el',
  hash: '',
  matched: [],
  meta: {},
}))
mockNuxtImport('usePageConfig', () => (slug: string) => {
  pageConfig.slugs.push(slug)
  return {
    layout: ref(pageConfig.layout),
    sections: ref([]),
    status: ref(pageConfig.error ? 'error' : 'success'),
    error: ref(pageConfig.error),
  }
})

describe.each([
  ['default', CustomPage],
  ['webside', WebsideCustomPage],
])('CustomPage (%s tree)', (_tree, Component) => {
  /** The first error the body's setup throws, captured as Nuxt would. */
  async function setupError(): Promise<unknown> {
    let captured: unknown
    const Parent = defineComponent({
      setup() {
        onErrorCaptured((error) => {
          captured ??= error
          return false
        })
        return () => h(Component)
      },
    })
    const wrapper = await mountSuspended(Parent, {
      route: false,
      global: { stubs: { PageSectionsShell: true, WebsidePageSectionsShell: true } },
    })
    await flushPromises()
    wrapper.unmount()
    return captured
  }

  beforeEach(() => {
    route.params = { slug: 'our-story' }
    pageConfig.layout = { isPublished: true, title: 'Our story' }
    pageConfig.error = null
    pageConfig.slugs = []
  })

  it('renders a published layout for its slug', async () => {
    expect(await setupError()).toBeUndefined()
    expect(pageConfig.slugs).toEqual(['our-story'])
  })

  it.each([[500], [502], [503], [504]])('answers 503 when the upstream fails with %s', async (statusCode) => {
    pageConfig.layout = null
    pageConfig.error = { statusCode }

    expect(await setupError()).toMatchObject({ statusCode: 503 })
  })

  it('answers 404 when the upstream has no such page', async () => {
    pageConfig.layout = null
    pageConfig.error = { statusCode: 404 }

    expect(await setupError()).toMatchObject({ statusCode: 404 })
  })

  it('answers 404 for a layout that exists but is not published', async () => {
    pageConfig.layout = { isPublished: false, title: 'Draft' }

    expect(await setupError()).toMatchObject({ statusCode: 404 })
  })

  it('answers 404 without a slug, before asking for a layout', async () => {
    route.params = {}

    expect(await setupError()).toMatchObject({ statusCode: 404 })
    expect(pageConfig.slugs).toEqual([])
  })
})
