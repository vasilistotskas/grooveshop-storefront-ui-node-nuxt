import { describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { makeContentPage } from '~~/test/fixtures/contentPage'

/**
 * The store's published content pages: a footer link per page — a
 * legal document at its dedicated route, any other at `/info/<slug>` —
 * and the set of slugs the store has.
 */
registerEndpoint('/api/content-pages', () => ({
  count: 2,
  next: null,
  previous: null,
  results: [
    makeContentPage({ id: 1, slug: 'return-policy', translations: { el: { title: 'Επιστροφές', body: '' } } }),
    makeContentPage({ id: 2, slug: 'faq', translations: { el: { title: 'Συχνές ερωτήσεις', body: '' } } }),
  ],
}))

describe('useFooterContentPages', () => {
  it('links each page at its canonical route and names the slugs the store has', async () => {
    clearNuxtData('footer-content-pages')
    const { links, published } = useFooterContentPages()

    await vi.waitFor(() => expect(links.value).toHaveLength(2), { interval: 1 })

    expect(links.value).toEqual([
      { label: 'Επιστροφές', to: '/return-policy' },
      { label: 'Συχνές ερωτήσεις', to: '/info/faq' },
    ])
    expect([...published.value]).toEqual(['return-policy', 'faq'])
  })
})
