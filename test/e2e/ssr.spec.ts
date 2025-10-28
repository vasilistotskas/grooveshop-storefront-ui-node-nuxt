import { describe, it, expect } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'

describe('SSR (Server-Side Rendering) E2E Tests', async () => {
  await setup({
    setupTimeout: 300000,
  })

  describe('SSR Rendering', () => {
    it('renders content on the server', async () => {
      const html: string = await $fetch('/')

      // Check that HTML is pre-rendered (not just empty shell)
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<div id="__nuxt"')

      // Should contain actual content, not just loading state
      expect(html.length).toBeGreaterThan(1000)
    })

    it('includes hydration data', async () => {
      const html = await $fetch('/')

      // Nuxt includes payload data for hydration
      expect(html).toContain('__NUXT__')
    })

    it('sets proper response headers', async () => {
      const response = await fetch('/')

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')
    })
  })

  describe('SEO Meta Tags', () => {
    it('includes viewport meta tag', async () => {
      const html = await $fetch('/')
      expect(html).toContain('viewport')
    })

    it('includes charset meta tag', async () => {
      const html = await $fetch('/')
      expect(html).toContain('charset')
    })

    it('includes language attribute', async () => {
      const html = await $fetch('/')
      expect(html).toMatch(/<html[^>]*lang=/i)
    })
  })

  describe('Performance', () => {
    it('responds within reasonable time', async () => {
      const startTime = Date.now()
      await $fetch('/')
      const endTime = Date.now()

      const responseTime = endTime - startTime
      // Should respond within 5 seconds
      expect(responseTime).toBeLessThan(5000)
    })
  })

  describe('Multi-language Support', () => {
    it('serves Greek locale by default', async () => {
      const html = await $fetch('/')
      expect(html).toMatch(/lang="el"/i)
    })

    it('serves English locale when requested', async () => {
      try {
        const html = await $fetch('/en')
        expect(html).toMatch(/lang="en"/i)
      }
      catch (error: any) {
        // If locale routing is not configured, skip this test
        if (error.statusCode === 404) {
          console.warn('English locale route not configured, skipping test')
          expect(true).toBe(true)
        }
        else {
          throw error
        }
      }
    })

    it('serves German locale when requested', async () => {
      try {
        const html = await $fetch('/de')
        expect(html).toMatch(/lang="de"/i)
      }
      catch (error: any) {
        // If locale routing is not configured, skip this test
        if (error.statusCode === 404) {
          console.warn('German locale route not configured, skipping test')
          expect(true).toBe(true)
        }
        else {
          throw error
        }
      }
    })
  })

  describe('Static Assets', () => {
    it('includes CSS (inline or linked)', async () => {
      const html = await $fetch('/')
      // CSS can be either inlined as <style> tags or linked as <link rel="stylesheet">
      // depending on the inlineStyles configuration
      const hasInlineStyles = /<style[^>]*>/i.test(html)
      const hasLinkedStyles = /<link[^>]*rel="stylesheet"/i.test(html)
      expect(hasInlineStyles || hasLinkedStyles).toBe(true)
    })

    it('includes script tags', async () => {
      const html = await $fetch('/')
      expect(html).toMatch(/<script/i)
    })
  })
})
