/**
 * A tap has to look like a tap.
 *
 * Phones have no hover, and Tailwind's preflight sets
 * `-webkit-tap-highlight-color: transparent`, which removes the only
 * cue the platform gives on its own. Measured on production: every
 * button and link resolved to a transparent highlight and the app
 * defined no pressed state, so a tap was visually identical to no tap
 * until the next paint. The merchant reported it as the site not
 * responding.
 *
 * The pressed state is a CSS class (`tap-press`) referenced from the
 * Nuxt UI button theme. That split is the fragile part: if the class
 * is renamed or dropped on either side, nothing breaks loudly — every
 * button silently goes back to giving no feedback. These tests pin the
 * two halves to each other.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..', '..')
const css = readFileSync(join(root, 'app/assets/css/main.css'), 'utf8')
const appConfig = readFileSync(join(root, 'app/app.config.ts'), 'utf8')

describe('tap feedback', () => {
  it('gives every Nuxt UI button the pressed-state class', () => {
    // Reaches buttons rendered as <a> too — the cart is one — which an
    // element selector cannot.
    expect(appConfig).toMatch(/base:\s*'[^']*tap-press/)
  })

  it('defines that class in the stylesheet', () => {
    expect(css).toContain('.tap-press')
  })

  it('darkens held controls', () => {
    expect(css).toMatch(/\.tap-press:active[\s\S]{0,200}brightness/)
  })

  it('dips them only when motion is welcome', () => {
    const reducedMotionGuard = css.match(
      /@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?scale\(0\.97\)/,
    )
    expect(reducedMotionGuard).not.toBeNull()
  })

  it('covers plain buttons and menu links, not every anchor', () => {
    // Scaling a line of body text reads as a glitch, so article links
    // must not be swept in: only navigation links darken.
    expect(css).toMatch(/nav a:active/)
    expect(css).not.toMatch(/^\s*a:active/m)
  })

  it('leaves disabled controls looking unpressable', () => {
    expect(css).toMatch(/:disabled:active/)
  })
})
