import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { injectHead } from '#imports'
import shareHeadPlugin from '~/plugins/builder-share-head'

/**
 * A share link's address carries its token, so its head names no address:
 * no canonical, no hreflang alternate, no `og:url`, whoever put them there.
 * The same tags stay on every other page; the control runs first and shows
 * the tags are there to be removed.
 */
const { surface } = vi.hoisted(() => ({ surface: vi.fn<() => BuilderSurface | null>(() => null) }))
mockNuxtImport('useBuilderSurface', () => surface)

const ADDRESS = 'https://shop.test/_builder/preview/secret-token'

const Page = defineComponent({
  setup() {
    useHead({
      link: [
        { rel: 'canonical', href: ADDRESS },
        { rel: 'alternate', hreflang: 'en', href: `${ADDRESS}?en` },
        { rel: 'preconnect', href: 'https://assets.shop.test' },
      ],
      meta: [
        { property: 'og:url', content: ADDRESS },
        { property: 'og:type', content: 'website' },
      ],
    })
    return () => h('div')
  },
})

async function renderedHead() {
  const head = injectHead()
  const before = new Set(head.entries.keys())
  await mountSuspended(Page, { route: false })
  await flushPromises()
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    head.render()
    vi.runOnlyPendingTimers()
  }
  finally {
    vi.useRealTimers()
  }
  const rendered = {
    canonical: document.querySelectorAll('link[rel="canonical"]').length,
    alternates: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
    ogUrl: document.querySelectorAll('meta[property="og:url"]').length,
    kept: [document.querySelectorAll('link[rel="preconnect"]').length, document.querySelectorAll('meta[property="og:type"]').length],
  }
  for (const key of head.entries.keys()) {
    if (!before.has(key)) head.entries.delete(key)
  }
  return rendered
}

const run = () => (shareHeadPlugin as unknown as { setup: () => void }).setup()

describe('builder-share-head plugin', () => {
  beforeEach(() => {
    surface.mockReturnValue(null)
  })

  it('leaves the head of a store page as it is', async () => {
    run()

    expect(await renderedHead()).toMatchObject({ canonical: 1, alternates: 1, ogUrl: 1 })
  })

  it('takes every tag that names the address out of a share link\'s head, and keeps the others', async () => {
    surface.mockReturnValue('share')
    run()

    expect(await renderedHead()).toEqual({ canonical: 0, alternates: 0, ogUrl: 0, kept: [1, 1] })
  })
})
