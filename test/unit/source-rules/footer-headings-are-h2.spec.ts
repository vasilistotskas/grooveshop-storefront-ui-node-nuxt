import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { COMPONENTS, boundAttribute, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * The footer's headings are `h2`, whatever the page above them ends on.
 *
 * The footer follows the page's content, whose last heading may be the
 * `h1` (a legal page with no sub-headings) or an `h2`; an `h3` there
 * skips a level and axe's `heading-order` fails on 77 of the webside
 * routes scanned on 2026-10-31. An `h2` never skips, after an `h1` or
 * after any deeper heading. The default design's columns come from
 * `UFooterColumns`, whose labels are `h3` unless `as` says otherwise.
 */
const HEADING_FILES = [
  'variants/webside/Footer/Newsletter.vue',
  'variants/webside/Footer/Desktop.vue',
  'Chrome/FooterNewsletter.vue',
]

describe('footer headings', () => {
  it.each(HEADING_FILES)('%s draws no heading below h2', (file) => {
    const levels: string[] = []
    walkElements(sfcTemplate(resolve(COMPONENTS, file)), (node) => {
      if (/^h[1-6]$/.test(node.tag)) levels.push(node.tag)
    })

    expect(levels.length, 'the file must still have a heading').toBeGreaterThan(0)
    expect(levels.filter(tag => tag !== 'h2')).toEqual([])
  })

  it('names the default footer columns h2', () => {
    const columns: Array<string | undefined> = []
    walkElements(sfcTemplate(resolve(COMPONENTS, 'Chrome/Footer.vue')), (node) => {
      if (node.tag === 'UFooterColumns') columns.push(boundAttribute(node, 'as'))
    })

    expect(columns.length).toBeGreaterThan(0)
    expect(columns.every(as => as?.includes('label') && as.includes('h2'))).toBe(true)
  })
})
