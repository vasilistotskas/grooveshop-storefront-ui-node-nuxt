import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'

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
 * Its sibling `overhang-is-clipped.spec.ts` forbids ADDING a negative
 * inset through `:ui`; this one catches failing to REMOVE one.
 */
const ROOTS = [resolve(__dirname, '../../../app/components')]

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

/** The value of a `prev:`/`next:` key in an object literal. */
const ARROW_KEY = /\b(prev|next)\s*:\s*(`[^`]*`|'[^']*'|"[^"]*")/g

const INLINE_INSET = /(?:^|\s)(sm:)?(-?(?:start|end)-(?:auto|\d+(?:\.\d+)?|px|full|\[[^\]]+\]))/g

describe('a carousel arrow override', () => {
  it('sets a sm: twin for every inline inset it declares', () => {
    const offenders: string[] = []

    for (const root of ROOTS) {
      for (const file of vueFilesUnder(root)) {
        // The frozen tree renders what those tenants have today.
        if (relative(root, file).split(sep).includes('variants')) continue

        const source = readFileSync(file, 'utf8')
        const label = relative(resolve(__dirname, '../../../app'), file)
          .split(sep)
          .join('/')

        for (const [, key, quoted] of source.matchAll(ARROW_KEY)) {
          const classes = quoted.slice(1, -1)
          const bare = new Set<string>()
          const responsive = new Set<string>()
          for (const [, prefix, utility] of classes.matchAll(INLINE_INSET)) {
            const axis = utility.replace(/^-/, '').split('-')[0] as string
            ;(prefix ? responsive : bare).add(axis)
          }
          for (const axis of bare) {
            if (!responsive.has(axis)) {
              offenders.push(`${label}: ${key} sets ${axis}-* with no sm: twin`)
            }
          }
        }
      }
    }

    expect(
      offenders,
      'UCarousel\'s sm:-start-12 / sm:-end-12 survive an unprefixed override and fight it',
    ).toEqual([])
  })
})
