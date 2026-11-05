import { describe, expect, it } from 'vitest'
import { BOXNOW_FRAME_ORIGINS } from '~~/shared/utils/boxnow-widget'
import { buildCspDirectives } from '~~/shared/utils/csp'
import { EMBED_FRAME_ORIGINS, YOUTUBE_THUMBNAIL_ORIGIN } from '~~/shared/utils/embeds'

/**
 * The origins the storefront's Content-Security-Policy must allow for
 * what the page actually loads. A missing origin fails silently for the
 * shopper — a blank frame and a console entry — at the worst possible
 * moment: the 3-D Secure challenge, the locker picker, the sign-in.
 */
/** A directive's sources, as tokens — a substring would pass `https://hooks.stripe.com.evil`. */
const pick = (directives: string[], name: string) =>
  (directives.find(d => d.startsWith(`${name} `)) ?? '').split(/\s+/).slice(1)

describe('who may frame a page', () => {
  it.each(['none', 'self'] as const)('says frame-ancestors %s, as asked', (frameAncestors) => {
    expect(pick(buildCspDirectives({ dev: false, frameAncestors }), 'frame-ancestors')).toEqual([`'${frameAncestors}'`])
  })
})

describe('third-party integrations the checkout and login actually load', () => {
  it('allows the Stripe 3-D Secure iframe origin', () => {
    // StripePayment.vue calls confirmCardPayment, which runs the SCA
    // challenge in an iframe served from hooks.stripe.com. Without it
    // every 3-D Secure card is blocked at the moment of payment — and
    // under EU SCA that is most cards, not an edge case.
    expect(pick(buildCspDirectives({ dev: false, frameAncestors: 'none' }), 'frame-src')).toContain('https://hooks.stripe.com')
  })

  it('allows the sibling js.stripe.com origins Elements starts frames on', () => {
    const directives = buildCspDirectives({ dev: false, frameAncestors: 'none' })
    expect(pick(directives, 'script-src')).toContain('https://*.js.stripe.com')
    expect(pick(directives, 'frame-src')).toContain('https://*.js.stripe.com')
    // The bare origin must survive alongside the wildcard: *.js.stripe.com
    // does NOT match js.stripe.com itself.
    expect(pick(directives, 'script-src')).toContain('https://js.stripe.com')
    expect(pick(directives, 'frame-src')).toContain('https://js.stripe.com')
  })

  const GOOGLE_AUTH_DIRECTIVES = ['script-src', 'style-src', 'connect-src', 'frame-src']
  const googleAuthSources = (directives: string[], name: string) =>
    pick(directives, name).filter(source => /(accounts|apis)\.google\.com/.test(source))

  it.each([
    ['script-src', 'https://accounts.google.com/gsi/client'],
    ['style-src', 'https://accounts.google.com/gsi/style'],
    ['connect-src', 'https://accounts.google.com/gsi/'],
    ['frame-src', 'https://accounts.google.com/gsi/'],
  ])('gives Google Identity Services exactly its %s source when One Tap is enabled', (name, source) => {
    // Google's set for gsi/client and nothing wider: a missing source
    // loses the prompt silently, an extra one widens the policy for nothing.
    const directives = buildCspDirectives({ dev: false, frameAncestors: 'none', googleGsiEnabled: true })
    expect(googleAuthSources(directives, name)).toEqual([source])
  })

  it.each(GOOGLE_AUTH_DIRECTIVES)('ships no Google auth origin in %s when One Tap is disabled', (name) => {
    // Gated like the pixel ids: a store that does not offer Google
    // sign-in should not widen its policy for it. The script does not
    // load in that case either, so the origins would be dead weight.
    const directives = buildCspDirectives({ dev: false, frameAncestors: 'none', googleGsiEnabled: false })
    expect(googleAuthSources(directives, name)).toEqual([])
  })
})

describe('frame-src', () => {
  it('lists every BoxNow widget origin, including the hosts its CDN redirects through', () => {
    // BoxNow's CDN redirects the v5 iframe to widget-v4/widget mid-flight,
    // and CSP validates every hop of a frame's redirect chain. The list
    // is `BOXNOW_FRAME_ORIGINS` — one source of truth with the
    // postMessage origin check (`boxnow-widget.spec.ts`).
    const frameSrc = pick(buildCspDirectives({ dev: false, frameAncestors: 'none' }), 'frame-src')

    expect(BOXNOW_FRAME_ORIGINS).toEqual(expect.arrayContaining([
      'https://widget-v5.boxnow.gr',
      'https://widget-v5.boxnow.cy',
      'https://widget-v4.boxnow.gr',
      'https://widget.boxnow.gr',
    ]))
    expect(BOXNOW_FRAME_ORIGINS.filter(origin => !frameSrc.includes(origin))).toEqual([])
  })

  it('drops the unverified BoxNow bg/hr origins', () => {
    // Only GR and CY are confirmed live BoxNow markets for this store
    // (verified 2026-09-27) — bg/hr were unverified guesses.
    const frameSrc = pick(buildCspDirectives({ dev: false, frameAncestors: 'none' }), 'frame-src')
    expect(frameSrc.filter(source => /boxnow\.(bg|hr)/.test(source))).toEqual([])
  })

  it('lists every origin a rich-text video is framed from', () => {
    // Videos in blog posts vanished because TWO layers dropped them: the
    // sanitiser and a frame-src with no video host. An origin the
    // sanitiser frames but CSP omits renders as a blank box with only a
    // console entry — invisible to any test that checks one layer.
    const frameSrc = pick(buildCspDirectives({ dev: false, frameAncestors: 'none' }), 'frame-src')

    expect(EMBED_FRAME_ORIGINS.filter(origin => !frameSrc.includes(origin))).toEqual([])
  })

  it('frames YouTube only from its privacy-enhanced host', () => {
    // The regular host sets YouTube and DoubleClick cookies as the frame
    // loads; the sanitiser never frames it, so the policy refuses it too.
    const frameSrc = pick(buildCspDirectives({ dev: false, frameAncestors: 'none' }), 'frame-src')

    expect(frameSrc).toContain('https://www.youtube-nocookie.com')
    expect(frameSrc).not.toContain('https://www.youtube.com')
  })
})

describe('img-src', () => {
  it('allows a YouTube facade\'s poster', () => {
    expect(pick(buildCspDirectives({ dev: false, frameAncestors: 'none' }), 'img-src')).toContain(YOUTUBE_THUMBNAIL_ORIGIN)
  })
})

describe('the maps', () => {
  const TILEJSON = 'https://maps.grooveshop.space/basemap.json'

  it('lets the map worker reach the platform maps host, and nothing else for tiles', () => {
    // MapLibre's worker fetches the TileJSON and every vector tile; the
    // glyphs are same-origin. No tile provider's origin is left anywhere.
    const directives = buildCspDirectives({ dev: false, frameAncestors: 'none', mapsTileJsonUrl: TILEJSON })
    expect(pick(directives, 'connect-src')).toContain('https://maps.grooveshop.space')
    expect(directives.join(';')).not.toMatch(/cartocdn|openstreetmap/)
  })

  it('allows the map worker as a same-origin script, with or without a nonce', () => {
    expect(pick(buildCspDirectives({ dev: false, frameAncestors: 'none', nonce: 'abc' }), 'worker-src')).toEqual([`'self'`])
  })

  it('adds no maps origin for an unset or unparseable TileJSON URL', () => {
    for (const mapsTileJsonUrl of ['', 'not a url']) {
      const connect = pick(buildCspDirectives({ dev: false, frameAncestors: 'none', mapsTileJsonUrl }), 'connect-src')
      expect(connect.some(source => source.includes('maps'))).toBe(false)
    }
  })
})
