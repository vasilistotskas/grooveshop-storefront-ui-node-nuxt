/**
 * Unit tests for server/utils/csp.ts — the pure helpers behind the
 * nonce-based CSP (middleware generates, render:html plugin stamps).
 */

import { describe, expect, it } from 'vitest'
import { generateCspNonce, stampCspNonce } from '../../../../server/utils/csp'

const NONCE = 'TESTNONCE123='

describe('generateCspNonce', () => {
  it('returns base64 of 16 random bytes', () => {
    const nonce = generateCspNonce()
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(Buffer.from(nonce, 'base64')).toHaveLength(16)
  })

  it('is unique per call', () => {
    expect(generateCspNonce()).not.toBe(generateCspNonce())
  })
})

describe('stampCspNonce', () => {
  it('stamps plain and attributed script tags', () => {
    const html = '<script>init()</script><script type="module" src="/_nuxt/entry.js"></script>'
    expect(stampCspNonce(html, NONCE)).toBe(
      `<script nonce="${NONCE}">init()</script><script nonce="${NONCE}" type="module" src="/_nuxt/entry.js"></script>`,
    )
  })

  it('leaves scripts that already carry a nonce untouched', () => {
    const html = '<script nonce="existing">x()</script>'
    expect(stampCspNonce(html, NONCE)).toBe(html)
  })

  it('stamps script-preload link tags but not stylesheets', () => {
    const html = '<link rel="modulepreload" href="/_nuxt/chunk.js"><link rel="preload" as="script" href="/_nuxt/x.js"><link rel="stylesheet" href="/_nuxt/app.css">'
    const out = stampCspNonce(html, NONCE)
    expect(out).toContain(`<link nonce="${NONCE}" rel="modulepreload"`)
    expect(out).toContain(`<link nonce="${NONCE}" rel="preload" as="script"`)
    expect(out).toContain('<link rel="stylesheet" href="/_nuxt/app.css">')
  })

  it('does not stamp JSON data blocks differently from executable scripts (harmless either way)', () => {
    const html = '<script type="application/json" id="__NUXT_DATA__">[]</script>'
    expect(stampCspNonce(html, NONCE)).toBe(
      `<script nonce="${NONCE}" type="application/json" id="__NUXT_DATA__">[]</script>`,
    )
  })
})
