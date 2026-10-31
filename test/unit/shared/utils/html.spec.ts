import DOMPurify from 'isomorphic-dompurify'
import { describe, it, expect } from 'vitest'
import { Window } from 'happy-dom'
import {
  buildMediaStreamUrl,
  decodeHtmlEntities,
  defaultHtmlImageConfig,
  htmlToPlainText,
  PAGE_CONTENT_MAX_WIDTH,
  sanitizeRichHtml,
  stripCloudflareImagePrefix,
  transformHtmlImages,
} from '~~/shared/utils/html'

const OPTIONS = { videoPlayLabel: 'Αναπαραγωγή βίντεο' }

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

  // A product description written with no whitespace between its tags
  // read "σπίτι.Συμβατό" in the page's meta description and JSON-LD.
  it('keeps the words of adjacent blocks apart', () => {
    expect(htmlToPlainText('<p>Για το σπίτι.</p><ul><li>Συμβατό</li><li>Ανθεκτικό</li></ul>'))
      .toBe('Για το σπίτι. Συμβατό Ανθεκτικό')
    expect(htmlToPlainText('Πρώτη<br>Δεύτερη<br/>Τρίτη')).toBe('Πρώτη Δεύτερη Τρίτη')
    expect(htmlToPlainText('<div class="x"><h2>Τίτλος</h2><p>Κείμενο</p></div>')).toBe('Τίτλος Κείμενο')
  })

  it('joins text across inline tags, which can sit inside a word', () => {
    expect(htmlToPlainText('<p>w<b>or</b>d and <a href="/x">a link</a></p>')).toBe('word and a link')
  })
})

describe('sanitizeRichHtml', () => {
  const sanitize = (html: string | null | undefined) => sanitizeRichHtml(html, OPTIONS)

  it('keeps an FAQ item exactly as the editor saves it', () => {
    // What the editor saves, measured on staging: closed, the answer as
    // the element's own children. `.article` styles it as the mobile
    // footer's accordion (assets/css/main.css).
    const html
      = '<details class="mce-accordion">\n'
        + '<summary>Πόσο κρατά η μπαταρία;</summary>\n'
        + '<p>Περίπου <strong>2 μέρες</strong> σε κανονική χρήση.</p>\n'
        + '</details>'

    expect(sanitize(html)).toBe(html)
  })

  it('keeps an allow-listed video embed', () => {
    const html
      = '<p>before</p>'
        + '<iframe src="https://player.vimeo.com/video/76979871" '
        + 'allowfullscreen title="v"></iframe>'
        + '<p>after</p>'

    const out = sanitize(html)

    expect(out).toContain('<iframe')
    expect(out).toContain('https://player.vimeo.com/video/76979871')
    expect(out).toContain('before')
    expect(out).toContain('after')
  })

  it('strips an iframe from a non-allow-listed origin', () => {
    const out = sanitize(
      '<iframe src="https://evil.example/x"></iframe><p>kept</p>',
    )

    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('evil.example')
    expect(out).toContain('kept')
  })

  it('never permits srcdoc, even on an allow-listed origin', () => {
    // srcdoc opens a full nested document with no origin of its own —
    // DOMPurify's stated reason for forbidding iframe by default.
    const out = sanitize(
      '<iframe src="https://www.youtube.com/embed/a" '
      + 'srcdoc="<script>alert(1)</script>"></iframe>',
    )

    expect(out).not.toContain('srcdoc')
    expect(out).not.toContain('alert(1)')
  })

  it('still removes scripts and event handlers', () => {
    const out = sanitize(
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
    const out = sanitize(
      '<p><a href="https://example.com/a">link</a>'
      + '<img src="https://cdn.example.com/i.png" alt="i"></p>',
    )

    expect(out).toContain('https://example.com/a')
    expect(out).toContain('https://cdn.example.com/i.png')
  })

  it('drops the typeface and the Word-only properties from text pasted from Word', () => {
    // As webside's posts store it (post 23): the span named Roboto, the
    // face downloaded mid-render and the paragraph reflowed (CLS 0.115).
    const out = sanitize(
      '<p class="MsoNormal" style="line-height: 115%; mso-ansi-language: EL">'
      + '<span style="font-family: Roboto; font-size: 12.0pt; color: #3364ff">text</span>'
      + '<span style="font: italic 12pt Roboto">shorthand</span></p>',
    )

    expect(out).toBe(
      '<p style="line-height: 115%">'
      + '<span style="font-size: 12.0pt; color: #3364ff">text</span>'
      + '<span>shorthand</span></p>',
    )
  })

  it('keeps a declaration whose value carries a semicolon', () => {
    const style = 'background-image: url("data:image/png;base64,AAAA"); font-family: Roboto'

    expect(sanitize(`<div style='${style}'>x</div>`))
      .toBe('<div style="background-image: url(&quot;data:image/png;base64,AAAA&quot;)">x</div>')
  })

  it('keeps the classes an author set and drops the ones Word set', () => {
    expect(sanitize('<p class="MsoListParagraph lead msocomoff">x</p>'))
      .toBe('<p class="lead">x</p>')
  })

  it('drops the empty comment links Word leaves and keeps every other link', () => {
    const out = sanitize(
      '<p>a<a id="_anchor_1" class="msocomanchor" '
      + 'href="https://d.docs.live.net/351b/Content.docx#_msocom_1"></a>'
      + '<a href="#_msocom_2">[A2]</a><a href="https://example.com/"></a></p>',
    )

    expect(out).toBe('<p>a<a href="#_msocom_2">[A2]</a><a href="https://example.com/"></a></p>')
  })

  it('leaves the other callers of the DOMPurify singleton untouched', () => {
    // The TOTP QR code goes through DOMPurify directly.
    sanitize('<p style="font-family: Roboto">x</p>')

    expect(DOMPurify.sanitize('<p class="MsoNormal" style="font-family: Roboto">x</p>'))
      .toBe('<p class="MsoNormal" style="font-family: Roboto">x</p>')
  })

  it('returns an empty string for empty input', () => {
    expect(sanitize('')).toBe('')
    expect(sanitize(null)).toBe('')
    expect(sanitize(undefined)).toBe('')
  })
})

describe('sanitizeRichHtml: YouTube facades', () => {
  /** The sanitised HTML in a detached element, to query like a page. */
  function render(html: string) {
    const document = new Window().document
    const root = document.createElement('div')
    root.innerHTML = sanitizeRichHtml(html, OPTIONS)
    return root
  }

  // As the store's editor saves a YouTube Short (measured on webside.gr).
  const SHORT
    = '<p style="text-align: center;"><iframe title="YouTube video player" '
      + 'src="https://www.youtube.com/embed/eIiZ-JHL5aw?feature=shared" width="315" height="560" '
      + 'frameborder="0" allowfullscreen="allowfullscreen"></iframe></p>'

  it('replaces the iframe with a named play button: no player, no YouTube frame', () => {
    const root = render(SHORT)

    expect(root.querySelector('iframe')).toBeNull()
    const button = root.querySelector('button')
    expect(button?.getAttribute('type')).toBe('button')
    expect(button?.getAttribute('aria-label')).toBe(OPTIONS.videoPlayLabel)
    expect(button?.dataset.youtubeId).toBe('eIiZ-JHL5aw')
    expect(button?.dataset.youtubeTitle).toBe('YouTube video player')
  })

  it('gives the facade the iframe\'s box and the video\'s poster', () => {
    const style = render(SHORT).querySelector('button')?.getAttribute('style')

    expect(style).toContain('--embed-w: 315px')
    expect(style).toContain('--embed-h: 560px')
    expect(style).toContain('url("https://i.ytimg.com/vi/eIiZ-JHL5aw/hqdefault.jpg")')
  })

  it('keeps the author\'s own style and class on the facade', () => {
    const button = render(
      '<iframe class="aligncenter" style="display: table; margin-left: auto; margin-right: auto;" '
      + 'src="https://www.youtube.com/embed/vrd010OWYBg" width="315" height="560"></iframe>',
    ).querySelector('button')

    expect(button?.getAttribute('style')).toContain('display: table; margin-left: auto; margin-right: auto;')
    expect(button?.classList.contains('aligncenter')).toBe(true)
    expect(button?.classList.contains('rich-embed')).toBe(true)
  })

  it('treats a privacy-enhanced embed the same way', () => {
    const root = render('<iframe src="https://www.youtube-nocookie.com/embed/frC_MO1lVaE"></iframe>')

    expect(root.querySelector('iframe')).toBeNull()
    expect(root.querySelector('button')?.dataset.youtubeId).toBe('frC_MO1lVaE')
  })

  it('carries the start time, from `start` or a share link\'s `t`', () => {
    expect(render('<iframe src="https://www.youtube.com/embed/frC_MO1lVaE?start=42"></iframe>')
      .querySelector('button')?.dataset.youtubeStart).toBe('42')
    expect(render('<iframe src="https://www.youtube.com/embed/frC_MO1lVaE?t=1m5s"></iframe>')
      .querySelector('button')?.dataset.youtubeStart).toBe('65')
    expect(render('<iframe src="https://www.youtube.com/embed/frC_MO1lVaE"></iframe>')
      .querySelector('button')?.dataset.youtubeStart).toBeUndefined()
  })

  it('moves a YouTube embed it cannot read to the privacy-enhanced host, loaded lazily', () => {
    const frame = render('<iframe src="https://www.youtube.com/embed/videoseries?list=PL123"></iframe>')
      .querySelector('iframe')

    expect(frame?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/videoseries?list=PL123')
    expect(frame?.getAttribute('loading')).toBe('lazy')
  })

  it('leaves a Vimeo embed as it was', () => {
    const frame = render('<iframe src="https://player.vimeo.com/video/76979871" width="640" height="360"></iframe>')
      .querySelector('iframe')

    expect(frame?.getAttribute('src')).toBe('https://player.vimeo.com/video/76979871')
    expect(frame?.getAttribute('width')).toBe('640')
  })

  it('still strips a look-alike host instead of building a facade for it', () => {
    const root = render('<iframe src="https://youtube.com.evil.example/embed/eIiZ-JHL5aw"></iframe>')

    expect(root.querySelector('iframe')).toBeNull()
    expect(root.querySelector('button')).toBeNull()
  })

  it('escapes the author\'s title and style rather than letting them out of their attribute', () => {
    const root = render(
      '<iframe src="https://www.youtube.com/embed/eIiZ-JHL5aw" '
      + 'title="&quot;><img src=x onerror=alert(1)>" '
      + 'style="color: red&quot;><script>alert(2)</script>"></iframe>',
    )

    expect(root.querySelectorAll('img, script')).toHaveLength(0)
    expect(root.querySelector('button')?.dataset.youtubeTitle).toBe('"><img src=x onerror=alert(1)>')
  })
})

describe('transformHtmlImages', () => {
  const config = {
    mediaStreamOrigin: 'https://assets.example.gr',
    mediaStreamPath: '/media_stream-image',
    allowedDomains: ['https://api.example.gr'],
    maxWidth: 704,
  }
  const key = '/media/x/uploads/tinymce/a.png'
  const url = (w: number, h: number, fit: 'contain' | 'inside' = 'contain') =>
    `https://assets.example.gr/media_stream-image${key}/${w}/${h}/${fit}/entropy/transparent/0/80.avif`

  it('bounds an image with no dimensions to the column, width only, with no 2x candidate', () => {
    const out = transformHtmlImages(`<img src="https://api.example.gr${key}">`, config)

    // `inside`: the width is a bound and the source keeps its own aspect.
    // `contain` with one axis padded a narrower source out to the bound.
    expect(out).toContain(`src="${url(704, 0, 'inside')}"`)
    // No authored width to fix its rendered size: a source narrower than
    // the bound would come back identical for "2x" and draw at half size.
    expect(out).not.toContain('srcset=')
    expect(out).not.toContain('sizes=')
    expect(out).not.toContain('/0/0/')
    expect(out).not.toMatch(/\swidth=/)
  })

  it('caps an authored width at the bound and keeps the authored aspect', () => {
    const out = transformHtmlImages(
      `<img src="https://api.example.gr${key}" width="1408" height="704">`,
      config,
    )

    expect(out).toContain(`src="${url(704, 352)}"`)
    expect(out).toContain(`${url(1408, 704)} 1408w`)
    // The author's own attributes are left as written
    expect(out).toContain('width="1408"')
    expect(out).toContain('height="704"')
  })

  describe('with the real size the API records (data-natural-width / data-natural-height)', () => {
    const natural = (w: number, h: number) => `data-natural-width="${w}" data-natural-height="${h}"`

    it('keeps the percentage layout of the author, offers 1x and 2x of the column and reserves the aspect', () => {
      const out = transformHtmlImages(
        `<img src="https://api.example.gr${key}" width="100%" height="100%" ${natural(1600, 1200)}>`,
        config,
      )

      expect(out).toContain(`src="${url(704, 0, 'inside')}"`)
      expect(out).toContain(`${url(704, 0, 'inside')} 704w`)
      expect(out).toContain(`${url(1408, 0, 'inside')} 1408w`)
      expect(out).toContain('sizes="auto, (max-width: 704px) 100vw, 704px"')
      // The layout stays as authored; a percentage height is dropped as before.
      expect(out).toContain('width="100%"')
      expect(out).not.toMatch(/\sheight=/)
      expect(out).toContain('style="aspect-ratio: 1600 / 1200"')
      expect(out).toContain(natural(1600, 1200))
    })

    it('never asks for more than the file has', () => {
      const out = transformHtmlImages(
        `<img src="https://api.example.gr${key}" width="100%" ${natural(900, 600)}>`,
        config,
      )

      expect(out).toContain(`${url(704, 0, 'inside')} 704w`)
      expect(out).toContain(`${url(900, 0, 'inside')} 900w`)
      expect(out).not.toContain('1408w')
    })

    it('offers one candidate for a file narrower than the column', () => {
      const out = transformHtmlImages(`<img src="https://api.example.gr${key}" ${natural(400, 300)}>`, config)

      expect(out.match(/\d+w/g)).toEqual(['400w'])
    })

    it('appends the aspect to an existing style', () => {
      const out = transformHtmlImages(`<img src="https://api.example.gr${key}" style="border: 1px solid" ${natural(800, 400)}>`, config)

      expect(out).toContain('style="border: 1px solid; aspect-ratio: 800 / 400"')
    })

    it('leaves the aspect to authored pixel dimensions', () => {
      const out = transformHtmlImages(`<img src="https://api.example.gr${key}" width="300" height="150" ${natural(900, 450)}>`, config)

      expect(out).not.toContain('aspect-ratio')
    })

    it('renders an image without a recorded size as before', () => {
      const out = transformHtmlImages(`<img src="https://api.example.gr${key}" width="100%">`, config)

      expect(out).not.toContain('srcset=')
      expect(out).not.toContain('aspect-ratio')
    })
  })

  it('requests a smaller authored width as written', () => {
    const out = transformHtmlImages(
      `<img src="https://api.example.gr${key}" width="300" height="150">`,
      config,
    )

    expect(out).toContain(`src="${url(300, 150)}"`)
    expect(out).toContain(`${url(600, 300)} 600w`)
    expect(out).toContain('sizes="auto, (max-width: 300px) 100vw, 300px"')
  })

  it('lets the layout pick the candidate only for a lazy image', () => {
    // A two-column gallery draws a 352px image in a 176px column; only
    // `auto` reaches the real width, and a browser honours it on a lazy
    // image alone, so an eager one keeps the declared list.
    const tag = (loading: string) =>
      transformHtmlImages(`<img src="https://api.example.gr${key}" width="352" height="198" loading="${loading}">`, config)

    expect(tag('lazy')).toContain('sizes="auto, (max-width: 352px) 100vw, 352px"')
    expect(tag('eager')).toContain('sizes="(max-width: 352px) 100vw, 352px"')
  })

  it('keeps a percentage width, draws it across that share of the column and replaces an editor srcset', () => {
    const out = transformHtmlImages(
      `<img src="https://api.example.gr${key}" width="100%" srcset="/x.png 2x" sizes="50vw">`,
      config,
    )

    // As the editor shows it: the attribute sets the CSS width
    expect(out).toContain('width="100%"')
    expect(out).not.toContain('/x.png')
    expect(out).not.toContain('50vw')
    expect(out).toContain(`src="${url(704, 0, 'inside')}"`)
    // sizes cannot name the column, so a 2x candidate would be fetched at
    // twice the page frame on every retina screen
    expect(out).not.toContain('srcset=')
  })

  it('requests a percentage width at that share of the bound, capped at the full column', () => {
    const half = transformHtmlImages(`<img src="https://api.example.gr${key}" width="50%">`, config)
    const over = transformHtmlImages(`<img src="https://api.example.gr${key}" width="150%">`, config)

    expect(half).toContain(`src="${url(352, 0, 'inside')}"`)
    expect(half).toContain('width="50%"')
    expect(over).toContain(`src="${url(704, 0, 'inside')}"`)
  })

  it('drops a width that is neither pixels nor a percentage, and a percentage height', () => {
    const out = transformHtmlImages(`<img src="https://api.example.gr${key}" width="20em" height="100%">`, config)

    expect(out).not.toMatch(/\swidth=/)
    expect(out).not.toMatch(/\sheight=/)
    expect(out).toContain(`src="${url(704, 0, 'inside')}"`)
  })

  it('bounds an authored width without a height, keeping the source aspect', () => {
    const out = transformHtmlImages(`<img src="https://api.example.gr${key}" width="300">`, config)

    expect(out).toContain(`src="${url(300, 0, 'inside')}"`)
    expect(out).toContain(`${url(600, 0, 'inside')} 600w`)
  })

  it('defaults the bound to the page content frame', () => {
    const { maxWidth: _unset, ...withoutBound } = config
    // webside's product descriptions: TinyMCE images saved with width="100%"
    const out = transformHtmlImages(`<img src="https://api.example.gr${key}" width="100%" height="100%">`, withoutBound)

    expect(out).toContain(`/${PAGE_CONTENT_MAX_WIDTH}/0/inside/`)
    expect(out).toContain('width="100%"')
    expect(out).not.toMatch(/\sheight=/)
  })

  it('leaves images it does not own untouched', () => {
    const external = '<img src="https://elsewhere.example/a.png" width="900">'
    const svg = `<img src="https://api.example.gr/media/logo.svg">`
    const data = '<img src="data:image/png;base64,AAAA">'
    const optimized = `<img src="https://assets.example.gr/media_stream-image${key}/704/0/contain/entropy/transparent/0/80.avif">`

    for (const tag of [external, svg, data, optimized]) {
      expect(transformHtmlImages(tag, config)).toBe(tag)
    }
  })
})
