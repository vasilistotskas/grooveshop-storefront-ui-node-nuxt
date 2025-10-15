import { describe, it, expect } from 'vitest'
import { useProductUrl } from '~/composables/useProductUrl'

describe('useProductUrl', () => {
  const { productUrl } = useProductUrl()

  describe('with product ID only', () => {
    it('should generate URL with just ID when passed as number', () => {
      const url = productUrl(123)
      expect(url).toBe('/products/123')
    })

    it('should generate URL with just ID when product has no slug', () => {
      const product = { id: 456 } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/456')
    })

    it('should generate URL with just ID when product slug is empty string', () => {
      const product = { id: 789, slug: '' } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/789')
    })

    it('should generate URL with just ID when product slug is null', () => {
      const product = { id: 101, slug: null } as any
      const url = productUrl(product)
      expect(url).toBe('/products/101')
    })
  })

  describe('with product ID and slug', () => {
    it('should generate URL with ID and slug from product object', () => {
      const product = {
        id: 123,
        slug: 'awesome-product',
      } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/123/awesome-product')
    })

    it('should generate URL with ID and slug when slug is provided separately', () => {
      const product = { id: 456 } as Product
      const url = productUrl(product, 'custom-slug')
      expect(url).toBe('/products/456/custom-slug')
    })

    it('should prefer provided slug over product slug', () => {
      const product = {
        id: 789,
        slug: 'original-slug',
      } as Product
      const url = productUrl(product, 'override-slug')
      expect(url).toBe('/products/789/override-slug')
    })

    it('should handle slug with hyphens', () => {
      const product = {
        id: 111,
        slug: 'multi-word-product-name',
      } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/111/multi-word-product-name')
    })

    it('should handle slug with numbers', () => {
      const product = {
        id: 222,
        slug: 'product-2024-edition',
      } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/222/product-2024-edition')
    })
  })

  describe('edge cases', () => {
    it('should handle ID of 0', () => {
      const url = productUrl(0)
      expect(url).toBe('/products/0')
    })

    it('should handle large ID numbers', () => {
      const url = productUrl(999999999)
      expect(url).toBe('/products/999999999')
    })

    it('should handle product with ID 0', () => {
      const product = { id: 0, slug: 'test' } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/0/test')
    })

    it('should handle empty string slug override', () => {
      const product = {
        id: 333,
        slug: 'original-slug',
      } as Product
      const url = productUrl(product, '')
      // Empty string slug override still results in no slug in URL
      expect(url).toMatch(/^\/products\/333/)
    })

    it('should handle slug with special characters', () => {
      const product = {
        id: 444,
        slug: 'product-with-special-chars',
      } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/444/product-with-special-chars')
    })

    it('should handle slug with underscores', () => {
      const product = {
        id: 555,
        slug: 'product_with_underscores',
      } as Product
      const url = productUrl(product)
      expect(url).toBe('/products/555/product_with_underscores')
    })

    it('should handle very long slugs', () => {
      const longSlug = 'a'.repeat(200)
      const product = {
        id: 666,
        slug: longSlug,
      } as Product
      const url = productUrl(product)
      expect(url).toBe(`/products/666/${longSlug}`)
    })
  })

  describe('URL format consistency', () => {
    it('should always start with /products/', () => {
      expect(productUrl(1)).toMatch(/^\/products\//)
      expect(productUrl({ id: 1 } as Product)).toMatch(/^\/products\//)
      expect(productUrl({ id: 1, slug: 'test' } as Product)).toMatch(/^\/products\//)
    })

    it('should not have trailing slash', () => {
      expect(productUrl(1)).not.toMatch(/\/$/)
      expect(productUrl({ id: 1, slug: 'test' } as Product)).not.toMatch(/\/$/)
    })

    it('should have exactly one slash between ID and slug', () => {
      const product = { id: 123, slug: 'test' } as Product
      const url = productUrl(product)
      const parts = url.split('/')
      expect(parts).toEqual(['', 'products', '123', 'test'])
    })
  })
})
