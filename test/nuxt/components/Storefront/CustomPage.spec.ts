import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, onErrorCaptured, ref } from 'vue'
import CustomPage from '~/components/Storefront/CustomPage.vue'
import WebsideCustomPage from '~/components/variants/webside/Storefront/CustomPage.vue'

/**
 * The catch-all `/[slug]` page renders a published builder page, and
 * its status is what crawlers see: no published page is a 404 (the
 * page does not exist), while an upstream failure is a 503 — temporary,
 * so a backend blip never de-indexes a live page, and retryable by
 * error.vue's one-shot reload.
 */
const { route, builderPage } = vi.hoisted(() => ({
  route: { params: { slug: 'our-story' } as Record<string, string> },
  builderPage: {
    page: null as null | { sections: [] },
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
mockNuxtImport('useBuilderPage', () => (slug: string) => {
  builderPage.slugs.push(slug)
  return {
    page: ref(builderPage.page),
    sections: ref([]),
    status: ref(builderPage.error ? 'error' : 'success'),
    error: ref(builderPage.error),
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
    builderPage.page = { sections: [] }
    builderPage.error = null
    builderPage.slugs = []
  })

  it('renders a published page for its slug', async () => {
    expect(await setupError()).toBeUndefined()
    expect(builderPage.slugs).toEqual(['our-story'])
  })

  it.each([[500], [502], [503], [504]])('answers 503 when the upstream fails with %s', async (statusCode) => {
    builderPage.page = null
    builderPage.error = { statusCode }

    expect(await setupError()).toMatchObject({ statusCode: 503 })
  })

  it('answers 404 when the upstream has no such page', async () => {
    builderPage.page = null
    builderPage.error = { statusCode: 404 }

    expect(await setupError()).toMatchObject({ statusCode: 404 })
  })

  it('answers 404 when the store has not built the page, which is no error upstream', async () => {
    builderPage.page = null

    expect(await setupError()).toMatchObject({ statusCode: 404 })
  })

  it('answers 404 without a slug, before asking for a page', async () => {
    route.params = {}

    expect(await setupError()).toMatchObject({ statusCode: 404 })
    expect(builderPage.slugs).toEqual([])
  })
})
