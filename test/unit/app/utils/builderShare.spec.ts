import { describe, expect, it } from 'vitest'
import { STATIC_LAYOUT_ROUTES } from '~~/shared/utils/staticLayoutRoutes'
import { builderShareBody } from '~/utils/builderShare'

describe('builderShareBody', () => {
  it.each([
    ['home', 'home'],
    ['products', 'products'],
    ['blog', 'blog'],
    ['blog-post', 'blog'],
    ['contact', 'contact'],
    ['feedback', 'feedback'],
  ])('draws the page type %s with the body of its route (%s)', (page, key) => {
    expect(builderShareBody(page)).toEqual({ key, props: {} })
  })

  it.each(['about', 'vision', 'what-is-microlearning', 'why-microlearning'])('draws %s with the brand page, which asks for its type', (page) => {
    expect(builderShareBody(page)).toEqual({ key: 'brand-page', props: { pageType: page } })
  })

  it('draws a page the store made with the custom page body, which asks for its slug', () => {
    expect(builderShareBody('summer-sale')).toEqual({ key: 'custom-page', props: { slug: 'summer-sale' } })
  })

  it('knows every page type that has a route of its own', () => {
    for (const page of Object.keys(STATIC_LAYOUT_ROUTES)) {
      expect(builderShareBody(page).key).not.toBe('custom-page')
    }
  })
})
