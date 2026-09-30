import { describe, expect, it } from 'vitest'
import { BOXNOW_FRAME_ORIGINS } from '~~/shared/utils/boxnow-widget'
import { buildCspDirectives } from '~~/shared/utils/csp'
import { EMBED_IFRAME_ORIGINS } from '~~/shared/utils/embeds'

/**
 * The origins the storefront's Content-Security-Policy must allow for
 * what the page actually loads. A missing origin fails silently for the
 * shopper — a blank frame and a console entry — at the worst possible
 * moment: the 3-D Secure challenge, the locker picker, the sign-in.
 */
/** A directive's sources, as tokens — a substring would pass `https://hooks.stripe.com.evil`. */
const pick = (directives: string[], name: string) =>
  (directives.find(d => d.startsWith(`${name} `)) ?? '').split(/\s+/).slice(1)

describe('third-party integrations the checkout and login actually load', () => {
  it('allows the Stripe 3-D Secure iframe origin', () => {
    // StripePayment.vue calls confirmCardPayment, which runs the SCA
    // challenge in an iframe served from hooks.stripe.com. Without it
    // every 3-D Secure card is blocked at the moment of payment — and
    // under EU SCA that is most cards, not an edge case.
    expect(pick(buildCspDirectives({ dev: false }), 'frame-src')).toContain('https://hooks.stripe.com')
  })

  it('allows the sibling js.stripe.com origins Elements starts frames on', () => {
    const directives = buildCspDirectives({ dev: false })
    expect(pick(directives, 'script-src')).toContain('https://*.js.stripe.com')
    expect(pick(directives, 'frame-src')).toContain('https://*.js.stripe.com')
    // The bare origin must survive alongside the wildcard: *.js.stripe.com
    // does NOT match js.stripe.com itself.
    expect(pick(directives, 'script-src')).toContain('https://js.stripe.com')
    expect(pick(directives, 'frame-src')).toContain('https://js.stripe.com')
  })

  it('allows the Google Identity Services script when One Tap is enabled', () => {
    // setupSocialLogin loads accounts.google.com/gsi/client as a SCRIPT,
    // while the policy listed accounts.google.com under frame-src only.
    const directives = buildCspDirectives({ dev: false, googleGsiEnabled: true })
    expect(pick(directives, 'script-src')).toContain('https://accounts.google.com/gsi/client')
    expect(pick(directives, 'connect-src')).toContain('https://accounts.google.com/gsi/')
    expect(pick(directives, 'connect-src')).toContain('https://apis.google.com/js/')
    expect(pick(directives, 'frame-src')).toContain('https://apis.google.com/js/')
  })

  it('ships no Google auth origins when One Tap is disabled', () => {
    // Gated like the pixel ids: a store that does not offer Google
    // sign-in should not widen its policy for it. The script does not
    // load in that case either, so the origins would be dead weight.
    const directives = buildCspDirectives({ dev: false, googleGsiEnabled: false })
    const google = (name: string) => pick(directives, name).filter(source => /(accounts|apis)\.google\.com/.test(source))
    expect(google('script-src')).toEqual([])
    expect(google('connect-src')).toEqual([])
  })
})

describe('frame-src', () => {
  it('lists every BoxNow widget origin, including the hosts its CDN redirects through', () => {
    // BoxNow's CDN redirects the v5 iframe to widget-v4/widget mid-flight,
    // and CSP validates every hop of a frame's redirect chain. The list
    // is `BOXNOW_FRAME_ORIGINS` — one source of truth with the
    // postMessage origin check (`boxnow-widget.spec.ts`).
    const frameSrc = pick(buildCspDirectives({ dev: false }), 'frame-src')

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
    const frameSrc = pick(buildCspDirectives({ dev: false }), 'frame-src')
    expect(frameSrc.filter(source => /boxnow\.(bg|hr)/.test(source))).toEqual([])
  })

  it('lists every video origin the rich-text sanitiser lets through', () => {
    // Videos in blog posts vanished because TWO layers dropped them: the
    // sanitiser and a frame-src with no video host. An origin the
    // sanitiser keeps but CSP omits renders as a blank box with only a
    // console entry — invisible to any test that checks one layer.
    const frameSrc = pick(buildCspDirectives({ dev: false }), 'frame-src')

    expect(EMBED_IFRAME_ORIGINS.filter(origin => !frameSrc.includes(origin))).toEqual([])
  })
})
