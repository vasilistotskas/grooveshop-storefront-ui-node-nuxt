import { describe, it, expect } from 'vitest'
import { useUrls } from '~/composables/useUrls'
import type { BlogCategory } from '~~/shared/openapi/types.gen'

const category = (id: number, slug: string) => ({ id, slug }) as BlogCategory

describe('useUrls', () => {
  const urls = useUrls()

  it.each([
    ['blogPostUrl', urls.blogPostUrl(123, 'my-awesome-post'), '/blog/post/123/my-awesome-post'],
    ['productUrl', urls.productUrl(500, 'awesome-product'), '/products/500/awesome-product'],
    ['blogCategoryUrl', urls.blogCategoryUrl(category(10, 'technology')), '/blog/category/10/technology'],
    ['blogCategoryAncestorUrl', urls.blogCategoryAncestorUrl(category(50, 'parent-category')), '/blog/category/50/parent-category'],
    ['blogAuthorUrl, which has no slug segment', urls.blogAuthorUrl(7), '/blog/author/7'],
    ['an id of 0', urls.productUrl(0, 'test'), '/products/0/test'],
  ])('%s', (_label, url, expected) => {
    expect(url).toBe(expected)
  })

  describe('blogCategoryUrlFromParts', () => {
    it.each([
      ['no ancestors', undefined, '/blog/category/100/javascript'],
      ['an empty ancestor list', [], '/blog/category/100/javascript'],
      ['one ancestor', [category(1, 'programming')], '/blog/category/100/programming/javascript'],
      [
        'the ancestors root first',
        [category(1, 'technology'), category(2, 'programming'), category(3, 'web')],
        '/blog/category/100/technology/programming/web/javascript',
      ],
    ])('builds the path with %s', (_label, ancestors, expected) => {
      expect(urls.blogCategoryUrlFromParts(100, 'javascript', ancestors)).toBe(expected)
    })
  })
})
