import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import BrandPage from '~/components/Storefront/BrandPage.vue'

/**
 * A brand page is a published builder page under its page type's route. Every
 * page owns exactly one `<h1>`: the page's own SEO title when it has one,
 * else a title for its page type, unless a section already provides the
 * heading. `about` and `vision` exist for every design, so each has its title
 * (a store whose vision page is all sections with no heading of their own
 * otherwise drew a page with no `<h1>`).
 */
const { page } = vi.hoisted(() => ({ page: { seoTitle: '' } }))

mockNuxtImport('useBuilderPage', () => () => ({
  page: ref({ sections: [] }),
  sections: ref([]),
  seoTitle: ref(page.seoTitle),
  seoDescription: ref(''),
  status: ref('success'),
  error: ref(null),
}))

const headingOf = async (pageType: string) => {
  const wrapper = await mountSuspended(BrandPage, { props: { pageType }, route: false })
  return wrapper.findAll('h1').map(heading => heading.text())
}

describe('BrandPage', () => {
  it.each([
    ['about', 'Σχετικά με εμάς'],
    ['vision', 'Όραμα'],
  ])('gives the %s page its own title when it has no SEO title and no heading section', async (pageType, title) => {
    page.seoTitle = ''

    expect(await headingOf(pageType)).toEqual([title])
  })

  it('prefers the SEO title the store gave the page', async () => {
    page.seoTitle = 'Η ιστορία μας'

    expect(await headingOf('vision')).toEqual(['Η ιστορία μας'])
  })
})
