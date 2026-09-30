import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { APP, readSource, withoutComments } from '../../helpers/sourceText'

/**
 * The stylesheet half of the theme contract.
 *
 * `app/app.config.ts` points Nuxt UI at a handful of custom tokens and
 * one custom class; `test/nuxt/theme/` renders the components to prove
 * the config applies them. What those renders cannot see is whether the
 * token or class they name is actually DEFINED — a missing definition
 * fails silently, back to Nuxt UI's default:
 *
 * - `--ui-on-secondary` / `--ui-on-success` / `--ui-on-warning` are what
 *   goes ON a solid accent/green/amber surface. `text-inverted` flips to
 *   near-black in dark mode, which measured 3.72:1 on the "New" badge;
 *   white on amber measured 2.94:1 and white on green 3.22:1 in light.
 * - `--ui-secondary-text` is the accent used AS TEXT; the fill measured
 *   4.18:1 on the dark page. It is derived from the accent so a tenant
 *   theme overriding `--ui-secondary` stays correct without knowing this.
 * - `.tap-press` is the pressed state every UButton carries. Tailwind's
 *   preflight removes the tap highlight, so without it a tap looks like
 *   no tap until the next paint — which the merchant reported as the
 *   site not responding.
 *
 * Asserted per scheme (`:root` and `.dark`), not by counting
 * occurrences: a count also passes on two definitions in one block.
 */
const css = withoutComments(readSource(resolve(APP, 'assets/css/main.css')))

/** The declarations of the top-level rule `selector { … }`, braces matched. */
function ruleBody(selector: string): string {
  const open = css.indexOf(`\n${selector} {`)
  if (open === -1) throw new Error(`main.css has no top-level ${selector} rule`)
  let depth = 0
  for (let at = css.indexOf('{', open); at < css.length; at++) {
    if (css[at] === '{') depth++
    else if (css[at] === '}' && --depth === 0) return css.slice(css.indexOf('{', open) + 1, at)
  }
  throw new Error(`${selector} is never closed`)
}

const declares = (body: string, token: string) =>
  new RegExp(`(?:^|[;{\\s])${token}\\s*:`).test(body)

describe('the theme tokens app.config.ts relies on', () => {
  it.each([
    '--ui-on-secondary',
    '--ui-on-success',
    '--ui-on-warning',
    '--ui-secondary-text',
  ])('%s is defined for both colour schemes', (token) => {
    expect(declares(ruleBody(':root'), token), `${token} missing from :root`).toBe(true)
    expect(declares(ruleBody('.dark'), token), `${token} missing from .dark`).toBe(true)
  })

  it('derives the dark accent-as-text from the accent rather than hardcoding it', () => {
    // A fixed light blue would be wrong for every tenant but this one.
    expect(ruleBody('.dark')).toMatch(
      /--ui-secondary-text:\s*color-mix\([^;]*var\(--ui-secondary\)/,
    )
  })

  it('exposes the accent-as-text as the text-accent utility, which article links use', () => {
    // Blog, CMS and legal body copy is authored HTML — no component can
    // fix a link colour there, so the stylesheet has to.
    expect(css).toMatch(/@utility text-accent\s*\{\s*color:\s*var\(--ui-secondary-text\)/)
    expect(ruleBody('.article')).toMatch(/\ba\s*\{\s*@apply text-accent\b/)
  })
})

describe('the tap-press class', () => {
  it('darkens a held control', () => {
    expect(css).toMatch(/\.tap-press:active\s*\{\s*filter:\s*brightness\(/)
  })

  it('dips it only when motion is welcome', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{[^}]*\.tap-press:active\s*\{\s*transform:\s*scale\(0\.97\)/,
    )
  })

  it('leaves a disabled control looking unpressable', () => {
    expect(css).toMatch(/\.tap-press:disabled:active,\s*\.tap-press\[aria-disabled="true"\]:active\s*\{\s*transform:\s*none;\s*filter:\s*none;/)
  })

  it('darkens navigation links but never sweeps in every anchor', () => {
    // Scaling a line of body text reads as a glitch, not a press.
    expect(css).toMatch(/\bnav a:active\b/)
    expect(css).not.toMatch(/^\s*a:active/m)
  })
})
