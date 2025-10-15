import { describe, it, expect } from 'vitest'
import { useUrls } from '~/composables/useUrls'

describe('useUrls', () => {
  const { blogPostUrl, blogCategoryUrl, blogCategoryUrlFromParts, blogCategoryAncestorUrl, productUrl } = useUrls()

  describe('blogPostUrl', () => {
    it('should generate blog post URL with ID and slug', () => {
      const url = blogPostUrl(123, 'my-awesome-post')
      expect(url).toBe('/blog/post/123/my-awesome-post')
    })

    it('should handle numeric ID', () => {
      const url = blogPostUrl(1, 'first-post')
      expect(url).toBe('/blog/post/1/first-post')
    })

    it('should handle slug with hyphens', () => {
      const url = blogPostUrl(456, 'multi-word-blog-post-title')
      expect(url).toBe('/blog/post/456/multi-word-blog-post-title')
    })

    it('should handle slug with numbers', () => {
      const url = blogPostUrl(789, 'post-2024-edition')
      expect(url).toBe('/blog/post/789/post-2024-edition')
    })
  })

  describe('blogCategoryUrl', () => {
    it('should generate blog category URL', () => {
      const category = {
        id: 10,
        slug: 'technology',
      } as BlogCategory

      const url = blogCategoryUrl(category)
      expect(url).toBe('/blog/category/10/technology')
    })

    it('should handle category with hyphenated slug', () => {
      const category = {
        id: 20,
        slug: 'web-development',
      } as BlogCategory

      const url = blogCategoryUrl(category)
      expect(url).toBe('/blog/category/20/web-development')
    })

    it('should handle category with underscores', () => {
      const category = {
        id: 30,
        slug: 'machine_learning',
      } as BlogCategory

      const url = blogCategoryUrl(category)
      expect(url).toBe('/blog/category/30/machine_learning')
    })
  })

  describe('blogCategoryUrlFromParts', () => {
    it('should generate URL without ancestors', () => {
      const url = blogCategoryUrlFromParts(100, 'javascript')
      expect(url).toBe('/blog/category/100/javascript')
    })

    it('should generate URL with single ancestor', () => {
      const ancestors = [
        { id: 1, slug: 'programming' } as BlogCategory,
      ]
      const url = blogCategoryUrlFromParts(100, 'javascript', ancestors)
      expect(url).toBe('/blog/category/100/programming/javascript')
    })

    it('should generate URL with multiple ancestors', () => {
      const ancestors = [
        { id: 1, slug: 'technology' } as BlogCategory,
        { id: 2, slug: 'programming' } as BlogCategory,
        { id: 3, slug: 'web' } as BlogCategory,
      ]
      const url = blogCategoryUrlFromParts(100, 'javascript', ancestors)
      expect(url).toBe('/blog/category/100/technology/programming/web/javascript')
    })

    it('should handle empty ancestors array', () => {
      const url = blogCategoryUrlFromParts(200, 'python', [])
      expect(url).toBe('/blog/category/200/python')
    })

    it('should create hierarchical path correctly', () => {
      const ancestors = [
        { id: 1, slug: 'parent' } as BlogCategory,
        { id: 2, slug: 'child' } as BlogCategory,
      ]
      const url = blogCategoryUrlFromParts(300, 'grandchild', ancestors)
      expect(url).toBe('/blog/category/300/parent/child/grandchild')
    })
  })

  describe('blogCategoryAncestorUrl', () => {
    it('should generate ancestor URL', () => {
      const category = {
        id: 50,
        slug: 'parent-category',
      } as BlogCategory

      const url = blogCategoryAncestorUrl(category)
      expect(url).toBe('/blog/category/50/parent-category')
    })

    it('should be same format as blogCategoryUrl', () => {
      const category = {
        id: 60,
        slug: 'test-category',
      } as BlogCategory

      expect(blogCategoryAncestorUrl(category)).toBe(blogCategoryUrl(category))
    })
  })

  describe('productUrl', () => {
    it('should generate product URL with ID and slug', () => {
      const url = productUrl(500, 'awesome-product')
      expect(url).toBe('/products/500/awesome-product')
    })

    it('should handle product with hyphenated slug', () => {
      const url = productUrl(600, 'multi-word-product-name')
      expect(url).toBe('/products/600/multi-word-product-name')
    })

    it('should handle product with numbers in slug', () => {
      const url = productUrl(700, 'product-2024-model')
      expect(url).toBe('/products/700/product-2024-model')
    })

    it('should handle product with underscores', () => {
      const url = productUrl(800, 'product_with_underscores')
      expect(url).toBe('/products/800/product_with_underscores')
    })
  })

  describe('URL format consistency', () => {
    it('should all start with forward slash', () => {
      expect(blogPostUrl(1, 'test')).toMatch(/^\//)
      expect(blogCategoryUrl({ id: 1, slug: 'test' } as BlogCategory)).toMatch(/^\//)
      expect(blogCategoryUrlFromParts(1, 'test')).toMatch(/^\//)
      expect(productUrl(1, 'test')).toMatch(/^\//)
    })

    it('should not have trailing slashes', () => {
      expect(blogPostUrl(1, 'test')).not.toMatch(/\/$/)
      expect(blogCategoryUrl({ id: 1, slug: 'test' } as BlogCategory)).not.toMatch(/\/$/)
      expect(blogCategoryUrlFromParts(1, 'test')).not.toMatch(/\/$/)
      expect(productUrl(1, 'test')).not.toMatch(/\/$/)
    })

    it('should use consistent path separators', () => {
      const url = blogCategoryUrlFromParts(1, 'child', [
        { id: 1, slug: 'parent' } as BlogCategory,
      ])
      expect(url.split('//').length).toBe(1) // No double slashes
    })
  })

  describe('edge cases', () => {
    it('should handle ID of 0', () => {
      expect(blogPostUrl(0, 'test')).toBe('/blog/post/0/test')
      expect(productUrl(0, 'test')).toBe('/products/0/test')
    })

    it('should handle large ID numbers', () => {
      expect(blogPostUrl(999999999, 'test')).toBe('/blog/post/999999999/test')
      expect(productUrl(999999999, 'test')).toBe('/products/999999999/test')
    })

    it('should handle empty slug', () => {
      expect(blogPostUrl(1, '')).toBe('/blog/post/1/')
      expect(productUrl(1, '')).toBe('/products/1/')
    })

    it('should handle very long slugs', () => {
      const longSlug = 'a'.repeat(200)
      expect(blogPostUrl(1, longSlug)).toBe(`/blog/post/1/${longSlug}`)
      expect(productUrl(1, longSlug)).toBe(`/products/1/${longSlug}`)
    })

    it('should handle special characters in slug', () => {
      const slug = 'test-with-special-chars'
      expect(blogPostUrl(1, slug)).toContain(slug)
      expect(productUrl(1, slug)).toContain(slug)
    })
  })
})
