import { describe, expect, it } from 'vitest'
import {
  EMBED_IFRAME_ORIGINS,
  isAllowedEmbedUrl,
  parseYouTubeEmbed,
  youTubePlayerUrl,
} from '~~/shared/utils/embeds'

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

describe('parseYouTubeEmbed', () => {
  it('reads the video and its start from either YouTube embed origin', () => {
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/eIiZ-JHL5aw?feature=shared'))
      .toEqual({ id: 'eIiZ-JHL5aw', start: 0 })
    expect(parseYouTubeEmbed('https://www.youtube-nocookie.com/embed/eIiZ-JHL5aw?start=30'))
      .toEqual({ id: 'eIiZ-JHL5aw', start: 30 })
  })

  it('reads a share link\'s `t` in seconds or h/m/s, and prefers `start`', () => {
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/eIiZ-JHL5aw?t=90')?.start).toBe(90)
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/eIiZ-JHL5aw?t=1h2m3s')?.start).toBe(3723)
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/eIiZ-JHL5aw?start=5&t=90')?.start).toBe(5)
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/eIiZ-JHL5aw?t=soon')?.start).toBe(0)
  })

  it('is null for anything that is not one YouTube video', () => {
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/videoseries?list=PL123')).toBeNull()
    expect(parseYouTubeEmbed('https://www.youtube.com/watch?v=eIiZ-JHL5aw')).toBeNull()
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/short')).toBeNull()
    expect(parseYouTubeEmbed('https://www.youtube.com/embed/"><script>')).toBeNull()
    expect(parseYouTubeEmbed('https://player.vimeo.com/video/76979871')).toBeNull()
    expect(parseYouTubeEmbed('https://youtube.com.evil.example/embed/eIiZ-JHL5aw')).toBeNull()
    expect(parseYouTubeEmbed('not a url')).toBeNull()
    expect(parseYouTubeEmbed(null)).toBeNull()
  })
})

describe('youTubePlayerUrl', () => {
  it('plays from the privacy-enhanced host, at once, from the start time', () => {
    expect(youTubePlayerUrl({ id: 'eIiZ-JHL5aw', start: 0 }))
      .toBe('https://www.youtube-nocookie.com/embed/eIiZ-JHL5aw?autoplay=1')
    expect(youTubePlayerUrl({ id: 'eIiZ-JHL5aw', start: 65 }))
      .toBe('https://www.youtube-nocookie.com/embed/eIiZ-JHL5aw?autoplay=1&start=65')
  })
})
