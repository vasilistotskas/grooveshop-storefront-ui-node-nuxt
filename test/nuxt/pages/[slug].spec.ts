import { describe, it, expect } from 'vitest'

/**
 * Tests for the catch-all custom page (app/pages/[slug].vue).
 *
 * `definePageMeta`'s `validate` callback is a compiler macro argument —
 * it isn't exported from the compiled page module, so (mirroring the
 * existing pattern in test/nuxt/pages/products/[id]/[slug].spec.ts and
 * test/nuxt/pages/blog/post/[id]/[slug].spec.ts) these tests simulate
 * the exact logic the page implements rather than mounting the SFC.
 */

const RESERVED_SLUGS = new Set(['api', 'account', 'products', 'blog', 'cart', 'checkout', 'search'])
const SLUG_PATTERN = /^[a-z0-9-]+$/

function validateSlug(slug: unknown): boolean {
  if (typeof slug !== 'string') return false
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug)
}

function shouldRender404(input: { error: { statusCode?: number } | null, isPublished?: boolean }): boolean {
  return Boolean(input.error) || !input.isPublished
}

function normalizeErrorStatus(upstreamStatus: number): number {
  return upstreamStatus >= 500 ? 503 : 404
}

describe('[slug].vue — route validate guard', () => {
  it('accepts a plain lowercase-kebab slug', () => {
    expect(validateSlug('our-story')).toBe(true)
    expect(validateSlug('faq')).toBe(true)
    expect(validateSlug('brand-2026')).toBe(true)
  })

  it('rejects non-string params', () => {
    expect(validateSlug(undefined)).toBe(false)
    expect(validateSlug(['a', 'b'])).toBe(false)
  })

  it('rejects slugs with uppercase, spaces, or special characters', () => {
    expect(validateSlug('Our-Story')).toBe(false)
    expect(validateSlug('our story')).toBe(false)
    expect(validateSlug('our_story')).toBe(false)
    expect(validateSlug('../etc/passwd')).toBe(false)
    expect(validateSlug('café')).toBe(false)
  })

  it('rejects every reserved prefix so static routes always win', () => {
    for (const reserved of ['api', 'account', 'products', 'blog', 'cart', 'checkout', 'search']) {
      expect(validateSlug(reserved)).toBe(false)
    }
  })
})

describe('[slug].vue — 404 decision', () => {
  it('renders 404 when the API call errored', () => {
    expect(shouldRender404({ error: { statusCode: 404 }, isPublished: undefined })).toBe(true)
  })

  it('renders 404 when the layout has no published data', () => {
    expect(shouldRender404({ error: null, isPublished: false })).toBe(true)
    expect(shouldRender404({ error: null, isPublished: undefined })).toBe(true)
  })

  it('renders sections when the layout is published with no upstream error', () => {
    expect(shouldRender404({ error: null, isPublished: true })).toBe(false)
  })
})

describe('[slug].vue — upstream status normalization', () => {
  it('normalizes 5xx upstream failures to 503 (transient, not a real 404)', () => {
    expect(normalizeErrorStatus(500)).toBe(503)
    expect(normalizeErrorStatus(502)).toBe(503)
  })

  it('keeps 4xx upstream failures as 404', () => {
    expect(normalizeErrorStatus(404)).toBe(404)
    expect(normalizeErrorStatus(400)).toBe(404)
  })
})
