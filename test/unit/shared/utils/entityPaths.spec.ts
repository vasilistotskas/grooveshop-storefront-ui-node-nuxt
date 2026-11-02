import { describe, expect, it } from 'vitest'
import { blogCategoryPath, blogPostPath, categoryPath, contentPagePath, pagePath, productPath } from '~~/shared/utils/entityPaths'

describe('entity paths', () => {
  it('writes the route of each record', () => {
    expect(productPath(2, 'mini-powerbank')).toBe('/products/2/mini-powerbank')
    expect(categoryPath(3, 'powerbank')).toBe('/products/category/3/powerbank')
    expect(blogPostPath(4, 'guide')).toBe('/blog/post/4/guide')
    expect(blogCategoryPath(5, 'news')).toBe('/blog/category/5/news')
  })

  it('serves a page type a static route renders at that route, and any other at /<pageType>', () => {
    expect(pagePath('home')).toBe('/')
    expect(pagePath('about')).toBe('/about')
    expect(pagePath('spring-sale')).toBe('/spring-sale')
  })

  it('serves a legal content page at its own route and any other at /info/<slug>', () => {
    expect(contentPagePath('privacy')).toBe('/privacy-policy')
    expect(contentPagePath('terms')).toBe('/terms-of-use')
    expect(contentPagePath('faq')).toBe('/info/faq')
  })
})
