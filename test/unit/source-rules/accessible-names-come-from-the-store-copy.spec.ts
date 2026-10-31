import { describe, it, expect } from 'vitest'
import { APP, appLabel, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

/**
 * An element's accessible name is user-facing text, so it is the store's
 * copy in the page's language, never a literal in a template: webside's
 * "Load more posts" button carried `aria-label="Load more posts"` on a
 * Greek page, in English, over a visible «Περισσότερα» that the label
 * replaced (WCAG 2.5.3 Label in Name).
 *
 * Every `aria-label` is therefore bound (`:aria-label="t('…')"`); a
 * control that has visible text is named by that text, with any extra
 * words as visually hidden content, not as a label that overrides it.
 * Both designs are read: the rule is not exempt for webside.
 */
describe('aria-label', () => {
  it('is never a literal string in a template', () => {
    const offenders: string[] = []
    let read = 0
    for (const file of vueFiles(APP)) {
      walkElements(sfcTemplate(file), (node) => {
        read++
        for (const prop of node.props) {
          if (prop.type === 6 && prop.name === 'aria-label') {
            offenders.push(`${appLabel(file)}:${node.loc.start.line}`)
          }
        }
      })
    }

    expect(read, 'the walker must still read templates').toBeGreaterThan(1000)
    expect(offenders, 'bind the label to the component copy (`:aria-label="t(…)"`)').toEqual([])
  })
})
