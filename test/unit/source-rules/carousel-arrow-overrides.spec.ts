import { describe, it, expect, beforeAll } from 'vitest'
import { COMPONENTS, FROZEN, appLabel, readSource, vueFiles, withoutComments } from '../../helpers/sourceText'

/**
 * Repositioning a carousel arrow means beating its `sm:` default too.
 *
 * `UCarousel` hangs its arrows OUTSIDE the box from `sm` up
 * (`sm:-start-12` / `sm:-end-12`), and tailwind-merge does not treat a
 * breakpoint-prefixed class as conflicting with an unprefixed one. So a
 * `:ui` override written as `start-auto end-16` leaves `sm:-start-12`
 * standing, and above `sm` the button gets BOTH insets: on the demo
 * store's hero at 1920 the prev button ran from `left:-48px` to
 * `right:64px` — a 1889px invisible strip across the artwork — while
 * next sat at `right:-48px`, outside an `overflow-hidden` root that
 * clipped it away. The hero had no usable arrows at any desktop width,
 * which is worse than the mid-height overlap the override was written
 * to fix.
 *
 * So: every horizontal inset an arrow override sets needs its `sm:`
 * twin. The rule is deliberately narrow — only `prev`/`next` keys, only
 * the inline axis — because that is where the library's own default
 * lives.
 *
 * Tailwind 4.3 canonicalises `start-*`/`end-*` to `inset-s-*`/`inset-e-*`
 * (and `better-tailwindcss/enforce-canonical-classes` pushes authors
 * there), so both spellings are one family: `start-2` is twinned by
 * `sm:inset-s-2` — tailwind-merge drops the library's `sm:-start-12`
 * for either. The physical `left`/`right` are checked as families of
 * their own, and they work differently: tailwind-merge KEEPS
 * `sm:-start-12` beside `sm:left-4` (verified against tailwind-merge
 * 3.7), and it is Tailwind emitting `left` after `inset-inline-start`
 * in the same media block that lets the physical twin win — in a
 * left-to-right page only. Prefer `inset-s`/`inset-e`.
 *
 * Its sibling `overhang-is-clipped.spec.ts` forbids ADDING a negative
 * inset through `:ui`; this one catches failing to REMOVE one.
 */

/** The value of a `prev:`/`next:` key in an object literal. */
const ARROW_KEY = /\b(prev|next)\s*:\s*(`[^`]*`|'[^']*'|"[^"]*")/g

const INLINE_INSET = /(?:^|\s)(sm:)?-?(inset-s|inset-e|inset-x|start|end|left|right)-(?:auto|px|full|\d+(?:\.\d+)?|\d+\/\d+|\[[^\]]+\])(?=\s|$)/g

/** One family per property, whichever spelling wrote it. */
const FAMILY: Record<string, string> = { start: 'inset-s', end: 'inset-e' }

interface Override { site: string, key: string, bare: Set<string>, responsive: Set<string> }

let overrides: Override[]

beforeAll(() => {
  overrides = vueFiles(COMPONENTS, { exclude: [FROZEN] }).flatMap((file) => {
    const source = withoutComments(readSource(file))
    return [...source.matchAll(ARROW_KEY)].map(([, key, quoted]) => {
      const bare = new Set<string>()
      const responsive = new Set<string>()
      for (const [, prefix, utility] of quoted!.slice(1, -1).matchAll(INLINE_INSET)) {
        (prefix ? responsive : bare).add(FAMILY[utility!] ?? utility!)
      }
      return { site: appLabel(file), key: key!, bare, responsive }
    })
  })
})

describe('a carousel arrow override', () => {
  it('sets a sm: twin for every inline inset it declares', () => {
    const offenders = overrides.flatMap(({ site, key, bare, responsive }) =>
      [...bare].filter(family => !responsive.has(family)).map(family => `${site}: ${key} sets ${family}-* with no sm: twin`),
    )

    expect(
      offenders,
      'UCarousel\'s sm:-start-12 / sm:-end-12 survive an unprefixed override and fight it',
    ).toEqual([])
  })

  it('still recognises the arrow overrides it is meant to check', () => {
    // It went blind once already: the canonical `inset-s-*`/`inset-e-*`
    // spelling matched nothing, and Blog/Posts/Carousel.vue was unchecked.
    const withInsets = overrides.filter(o => o.bare.size > 0)
    expect(withInsets.map(o => o.site)).toContain('components/Blog/Posts/Carousel.vue')
    // Six since the product page's gallery, zoom viewer and suggestion
    // strip stopped being arrowed carousels (Groove Volt PR 5).
    expect(withInsets.length).toBeGreaterThanOrEqual(6)
  })
})
