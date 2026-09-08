import { describe, expect, it } from 'vitest'

import { buildCspDirectives } from '~~/shared/utils/csp'
import {
  EMBED_IFRAME_ORIGINS,
  isAllowedEmbedUrl,
} from '~~/shared/utils/embeds'
import { sanitizeRichHtml } from '~~/shared/utils/html'

/**
 * Videos embedded in blog posts rendered in the Django admin's TinyMCE
 * editor and silently vanished on the storefront. TWO independent
 * layers dropped them — an unconfigured `DOMPurify.sanitize()` (iframe
 * is not in its default allow-list) and a `frame-src` that listed no
 * video host — so fixing either alone still showed nothing. These
 * tests pin both, and pin that they agree.
 */
describe('isAllowedEmbedUrl', () => {
  it('accepts the allow-listed origins', () => {
    for (const origin of EMBED_IFRAME_ORIGINS) {
      expect(isAllowedEmbedUrl(`${origin}/embed/abc123`)).toBe(true)
    }
  })

  it('rejects look-alike hosts that a substring check would pass', () => {
    // Each of these contains "youtube.com" somewhere.
    expect(isAllowedEmbedUrl('https://youtube.com.evil.example/x')).toBe(false)
    expect(isAllowedEmbedUrl('https://evil.example/?x=youtube.com')).toBe(false)
    expect(isAllowedEmbedUrl('https://notyoutube.com/embed/x')).toBe(false)
  })

  it('rejects a bare host without the scheme, and http', () => {
    expect(isAllowedEmbedUrl('www.youtube.com/embed/x')).toBe(false)
    expect(isAllowedEmbedUrl('http://www.youtube.com/embed/x')).toBe(false)
  })

  it('rejects empty, relative and unparseable values', () => {
    expect(isAllowedEmbedUrl('')).toBe(false)
    expect(isAllowedEmbedUrl(null)).toBe(false)
    expect(isAllowedEmbedUrl(undefined)).toBe(false)
    expect(isAllowedEmbedUrl('/embed/x')).toBe(false)
    expect(isAllowedEmbedUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('sanitizeRichHtml', () => {
  it('keeps an allow-listed video embed', () => {
    const html
      = '<p>before</p>'
        + '<iframe src="https://www.youtube.com/embed/abc" '
        + 'allowfullscreen title="v"></iframe>'
        + '<p>after</p>'

    const out = sanitizeRichHtml(html)

    expect(out).toContain('<iframe')
    expect(out).toContain('https://www.youtube.com/embed/abc')
    expect(out).toContain('before')
    expect(out).toContain('after')
  })

  it('strips an iframe from a non-allow-listed origin', () => {
    const out = sanitizeRichHtml(
      '<iframe src="https://evil.example/x"></iframe><p>kept</p>',
    )

    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('evil.example')
    expect(out).toContain('kept')
  })

  it('never permits srcdoc, even on an allow-listed origin', () => {
    // srcdoc opens a full nested document with no origin of its own —
    // DOMPurify's stated reason for forbidding iframe by default.
    const out = sanitizeRichHtml(
      '<iframe src="https://www.youtube.com/embed/a" '
      + 'srcdoc="<script>alert(1)</script>"></iframe>',
    )

    expect(out).not.toContain('srcdoc')
    expect(out).not.toContain('alert(1)')
  })

  it('still removes scripts and event handlers', () => {
    const out = sanitizeRichHtml(
      '<script>alert(1)</script>'
      + '<img src=x onerror="alert(2)">'
      + '<a href="javascript:alert(3)">x</a>',
    )

    expect(out).not.toContain('<script')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('javascript:')
  })

  it('keeps ordinary links and images', () => {
    // Regression guard for the rejected approach: pinning
    // ALLOWED_URI_REGEXP to the video hosts would have satisfied the
    // iframe requirement while stripping every normal href/src out of
    // a blog post.
    const out = sanitizeRichHtml(
      '<p><a href="https://example.com/a">link</a>'
      + '<img src="https://cdn.example.com/i.png" alt="i"></p>',
    )

    expect(out).toContain('https://example.com/a')
    expect(out).toContain('https://cdn.example.com/i.png')
  })

  it('returns an empty string for empty input', () => {
    expect(sanitizeRichHtml('')).toBe('')
    expect(sanitizeRichHtml(null)).toBe('')
    expect(sanitizeRichHtml(undefined)).toBe('')
  })
})

describe('frame-src agrees with the sanitiser', () => {
  it('lists every origin the sanitiser will let through', () => {
    const frameSrc = buildCspDirectives({ dev: false }).find(d =>
      d.startsWith('frame-src'),
    )

    expect(frameSrc).toBeDefined()
    for (const origin of EMBED_IFRAME_ORIGINS) {
      // An origin the sanitiser keeps but CSP omits renders as a blank
      // box with only a console entry — the exact failure the owner
      // reported, and invisible to any test that checks one layer.
      expect(frameSrc).toContain(origin)
    }
  })
})
