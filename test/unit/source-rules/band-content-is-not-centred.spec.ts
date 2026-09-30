import { resolve } from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'
import { COMPONENTS, appLabel, classesOf, isElement, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

/**
 * Nothing inside a `PageSectionBand` may centre itself horizontally.
 *
 * The band owns the heading row, and it is LEFT-aligned in every
 * section — that is the whole point of putting it in one component
 * rather than letting each section write its own. A child that narrows
 * itself and then adds `mx-auto` therefore lands beside its own title
 * rather than under it: on the demo store's homepage at 1920 the FAQ
 * heading sat at x=265 and its first question at x=569, which reads as
 * two unrelated blocks.
 *
 * A reading measure is fine and often right — `max-w-3xl` on a column
 * of prose, `max-w-2xl` on a search field. It is the `mx-auto` beside
 * it that breaks the band.
 *
 * Only DIRECT children are checked. Deeper down, a centred element is
 * usually inside a card or a grid cell that has its own alignment, and
 * this rule would fight it.
 *
 * The frozen `variants/webside` tree has no sections of its own under
 * `PageSection/`; the live `PageSection/variants/delta_sigma` ones are
 * checked like every other section.
 */
const SECTIONS = resolve(COMPONENTS, 'PageSection')

const EDGE = '(?:^|[\\s\'"`:\\[])'
const CENTRES_ITSELF = new RegExp(`${EDGE}mx-auto(?:$|[\\s'"\`])`)

let bands = 0
let offenders: string[]

beforeAll(() => {
  offenders = []
  for (const file of vueFiles(SECTIONS)) {
    walkElements(sfcTemplate(file), (node) => {
      if (node.tag !== 'PageSectionBand') return
      bands++
      for (const child of node.children) {
        if (!isElement(child)) continue
        const classes = classesOf(child)
        if (CENTRES_ITSELF.test(classes)) offenders.push(`${appLabel(file)}: <${child.tag}> ${classes}`)
      }
      return false
    })
  }
})

describe('a section band\'s content', () => {
  it('is not centred away from the heading the band renders', () => {
    expect(
      offenders,
      'these centre themselves under a left-aligned band heading; keep the max-width, drop the mx-auto',
    ).toEqual([])
  })

  it('still sees the bands it is meant to check', () => {
    // A rename of the band component would make the rule vacuous.
    expect(bands).toBeGreaterThanOrEqual(20)
  })
})
