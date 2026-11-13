import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP, COMPONENTS, readSource, sfcTemplate, walkElements } from '../../helpers/sourceText'
import type { ElementNode } from '../../helpers/sourceText'

/**
 * A page shows one newsletter form. The newsletter band marks itself
 * `data-newsletter-section` when it is drawn, every footer form carries
 * `data-footer-newsletter`, and one rule in `main.css` hides the footer's
 * while the band is on the page. The three have to stay together: a
 * footer form without the attribute, or a band without its mark, would put
 * the second form back on webside's home and the demo's.
 */
const RULE = ':root:has([data-newsletter-section]) [data-footer-newsletter]'

const hasStatic = (node: ElementNode, name: string) => node.props.some(prop => prop.type === 6 && prop.name === name)

/** The template's top-level elements: the component's roots, one per `v-if` branch, and any reusable template defined beside them. */
function rootsOf(file: string): ElementNode[] {
  const roots: ElementNode[] = []
  walkElements(sfcTemplate(resolve(COMPONENTS, file)), (node) => {
    roots.push(node)
    return false
  })
  if (!roots.length) throw new Error(`${file} has no template root`)
  return roots
}

/** The template's first element: the component's root. */
const rootOf = (file: string): ElementNode => rootsOf(file)[0]!

describe('one newsletter form a page', () => {
  it('hides the footer form while the page draws the newsletter band', () => {
    const css = readSource(resolve(APP, 'assets/css/main.css'))
    const at = css.indexOf(`${RULE} {`)

    expect(at).toBeGreaterThanOrEqual(0)
    expect(css.slice(at, css.indexOf('}', at))).toMatch(/display:\s*none/)
  })

  // Each root that draws the form, in either design's layout of the band:
  // the band, and the base design's open section.
  it('marks the band, only where it draws its form', () => {
    const roots = rootsOf('PageSection/NewsletterSignup.vue').filter(node => node.tag !== 'DefineContent')

    expect(roots.map(node => node.tag)).toEqual(['section', 'PageSectionBand'])
    for (const root of roots) expect(hasStatic(root, 'data-newsletter-section')).toBe(true)
  })

  // Every place a footer draws its form, in both designs: each form's root,
  // and webside's phone wrapper, whose padding would stay without the form.
  it.each([
    'Chrome/FooterNewsletter.vue',
    'variants/webside/Footer/Newsletter.vue',
  ])('marks the footer form %s', (file) => {
    expect(hasStatic(rootOf(file), 'data-footer-newsletter')).toBe(true)
  })

  it('marks the wrapper of webside\'s phone footer form', () => {
    const wrappers: boolean[] = []
    walkElements(sfcTemplate(resolve(COMPONENTS, 'variants/webside/Chrome/Footer.vue')), (node, ancestors) => {
      if (node.tag === 'LazyWebsideFooterNewsletter') wrappers.push(hasStatic(ancestors.at(-1)!, 'data-footer-newsletter'))
    })

    expect(wrappers).toEqual([true])
  })
})
