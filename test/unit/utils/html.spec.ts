import { describe, it, expect } from 'vitest'
import {
  buildMediaStreamUrl,
  defaultHtmlImageConfig,
  stripCloudflareImagePrefix,
} from '../../../shared/utils/html'

describe('stripCloudflareImagePrefix', () => {
  it('recovers the source path from a Cloudflare Image Resizing URL', () => {
    expect(
      stripCloudflareImagePrefix(
        '/cdn-cgi/image/format=webp/media/webside/uploads/tinymce/a.png',
      ),
    ).toBe('/media/webside/uploads/tinymce/a.png')
  })

  it('handles multi-option transforms', () => {
    expect(
      stripCloudflareImagePrefix(
        '/cdn-cgi/image/format=webp,width=800,quality=75/media/b.png',
      ),
    ).toBe('/media/b.png')
  })

  it('leaves ordinary paths untouched', () => {
    expect(stripCloudflareImagePrefix('/media/webside/c.png')).toBe(
      '/media/webside/c.png',
    )
    expect(stripCloudflareImagePrefix('/cdn-cgi/trace')).toBe('/cdn-cgi/trace')
  })
})

describe('buildMediaStreamUrl', () => {
  const config = {
    ...defaultHtmlImageConfig,
    mediaStreamOrigin: 'https://assets.example.gr',
    mediaStreamPath: '/media_stream-image',
  }

  it('does not embed a Cloudflare transform prefix in the object key', () => {
    // Regression: a pasted CF-transformed src produced
    // /media_stream-image/cdn-cgi/image/format=webp/media/... which 404s.
    const url = buildMediaStreamUrl(
      'https://static.example.gr/cdn-cgi/image/format=webp/media/x/a.png',
      config,
    )

    expect(url).not.toContain('cdn-cgi')
    expect(url).toBe(
      'https://assets.example.gr/media_stream-image/media/x/a.png/0/0/contain/entropy/transparent/5/80.avif',
    )
  })

  it('builds the same URL for the already-clean source', () => {
    expect(
      buildMediaStreamUrl('https://static.example.gr/media/x/a.png', config),
    ).toBe(
      'https://assets.example.gr/media_stream-image/media/x/a.png/0/0/contain/entropy/transparent/5/80.avif',
    )
  })
})
