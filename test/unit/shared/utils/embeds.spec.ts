import { describe, expect, it } from 'vitest'
import { EMBED_IFRAME_ORIGINS, isAllowedEmbedUrl } from '~~/shared/utils/embeds'

/**
 * Videos embedded in blog posts rendered in the Django admin's TinyMCE
 * editor and silently vanished on the storefront. TWO independent
 * layers dropped them — an unconfigured `DOMPurify.sanitize()` (iframe
 * is not in its default allow-list) and a `frame-src` that listed no
 * video host. This origin check is what both layers share: the
 * sanitiser (`html.spec.ts`) keeps an iframe only from these origins,
 * and `csp.spec.ts` checks frame-src lists every one of them.
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
