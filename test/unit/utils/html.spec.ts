import { describe, it, expect } from 'vitest'
import {
  buildMediaStreamUrl,
  decodeHtmlEntities,
  defaultHtmlImageConfig,
  htmlToPlainText,
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
      'https://assets.example.gr/media_stream-image/media/x/a.png/0/0/contain/entropy/transparent/0/80.avif',
    )
  })

  it('builds the same URL for the already-clean source', () => {
    expect(
      buildMediaStreamUrl('https://static.example.gr/media/x/a.png', config),
    ).toBe(
      'https://assets.example.gr/media_stream-image/media/x/a.png/0/0/contain/entropy/transparent/0/80.avif',
    )
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes the named references a rich-text editor emits', () => {
    expect(decodeHtmlEntities('Johnson &amp; Johnson')).toBe('Johnson & Johnson')
    expect(decodeHtmlEntities('&quot;quoted&quot;')).toBe('"quoted"')
    expect(decodeHtmlEntities('a &lt; b &gt; c')).toBe('a < b > c')
    expect(decodeHtmlEntities('caf&eacute;')).toBe('caf&eacute;')
  })

  it('decodes decimal and hexadecimal numeric references', () => {
    expect(decodeHtmlEntities('&#8364;20')).toBe('€20')
    expect(decodeHtmlEntities('&#x1F600;')).toBe('😀')
    expect(decodeHtmlEntities('&#913;&#946;')).toBe('Αβ')
  })

  it('decodes each reference exactly once', () => {
    // The literal text `&lt;` was written as `&amp;lt;`. Decoding in two
    // passes would collapse it to `<` and lose what the author wrote.
    expect(decodeHtmlEntities('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;')
  })

  it('leaves an unknown or malformed reference untouched', () => {
    expect(decodeHtmlEntities('&bogus;')).toBe('&bogus;')
    expect(decodeHtmlEntities('Tom & Jerry')).toBe('Tom & Jerry')
    expect(decodeHtmlEntities('50% off & more')).toBe('50% off & more')
  })

  it('refuses code points that String.fromCodePoint would reject', () => {
    expect(decodeHtmlEntities('&#xD800;')).toBe('&#xD800;')
    expect(decodeHtmlEntities('&#0;')).toBe('&#0;')
  })

  it('handles empty input', () => {
    expect(decodeHtmlEntities('')).toBe('')
    expect(decodeHtmlEntities('no entities here')).toBe('no entities here')
  })
})

describe('htmlToPlainText', () => {
  it('strips tags, decodes references and collapses whitespace', () => {
    expect(htmlToPlainText('<p>Tom &amp; Jerry</p>')).toBe('Tom & Jerry')
    expect(htmlToPlainText('<h2>Title</h2>\n\n<p>Body   copy</p>')).toBe('Title Body copy')
  })

  it('keeps escaped markup the author wrote as visible text', () => {
    // Proves the order: tags are stripped BEFORE entities are decoded.
    // Decoding first would turn this into a real tag and delete it.
    expect(htmlToPlainText('<p>&lt;div&gt; is a block element</p>'))
      .toBe('<div> is a block element')
  })

  it('collapses the non-breaking spaces a WYSIWYG body is full of', () => {
    expect(htmlToPlainText('<p>Greek&nbsp;&nbsp;copy</p>')).toBe('Greek copy')
  })

  it('handles empty input', () => {
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText('<p></p>')).toBe('')
  })
})
