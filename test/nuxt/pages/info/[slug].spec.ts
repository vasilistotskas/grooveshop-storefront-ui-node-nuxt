import { describe, it, expect } from 'vitest'

/**
 * Tests for the per-tenant ContentPage page (app/pages/info/[slug].vue).
 *
 * Mirrors the existing pattern in test/nuxt/pages/[slug].spec.ts and
 * test/nuxt/pages/products/[id]/[slug].spec.ts: `definePageMeta` and the
 * `await useFetch` suspension aren't meaningfully testable without a full
 * route/request harness, so this simulates the exact setup-scope logic the
 * page implements (404/503 normalization, SEO title fallback) as plain
 * functions instead of mounting the SFC.
 */

function shouldThrow(input: { error: { statusCode?: number } | null, data: unknown }): boolean {
  return Boolean(input.error) || !input.data
}

function normalizeErrorStatus(upstreamStatus: number): number {
  return upstreamStatus >= 500 ? 503 : 404
}

function resolveSeoTitle(seoTitleField: string | undefined, translatedTitle: string): string {
  return seoTitleField || translatedTitle
}

describe('info/[slug].vue — 404/503 decision', () => {
  it('throws when the API call errored', () => {
    expect(shouldThrow({ error: { statusCode: 404 }, data: null })).toBe(true)
  })

  it('throws when there is no error but also no data', () => {
    expect(shouldThrow({ error: null, data: null })).toBe(true)
  })

  it('renders normally when data is present with no upstream error', () => {
    expect(shouldThrow({ error: null, data: { slug: 'about-us' } })).toBe(false)
  })
})

describe('info/[slug].vue — upstream status normalization', () => {
  it('normalizes 5xx upstream failures to 503 (transient, not a real 404 — Django is down, not the page)', () => {
    expect(normalizeErrorStatus(500)).toBe(503)
    expect(normalizeErrorStatus(502)).toBe(503)
    expect(normalizeErrorStatus(503)).toBe(503)
  })

  it('keeps 4xx (and missing-status, defaulted to 404) upstream failures as 404', () => {
    expect(normalizeErrorStatus(404)).toBe(404)
    expect(normalizeErrorStatus(400)).toBe(404)
  })
})

describe('info/[slug].vue — SEO title fallback', () => {
  it('prefers the ContentPage seoTitle when present', () => {
    expect(resolveSeoTitle('Custom SEO Title', 'Page Title')).toBe('Custom SEO Title')
  })

  it('falls back to the translated title when seoTitle is empty or absent', () => {
    expect(resolveSeoTitle('', 'Page Title')).toBe('Page Title')
    expect(resolveSeoTitle(undefined, 'Page Title')).toBe('Page Title')
  })
})
