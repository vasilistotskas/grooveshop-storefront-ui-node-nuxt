import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import type { ElementNode } from '../../helpers/sourceText'
import { COMPONENTS, boundAttribute, classesOf, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * The default design's shared chrome and cards are 44px targets on a phone
 * (the real-browser check, 2026-11-12, measured 28-36px). happy-dom lays
 * nothing out, so the classes that size them are the contract, as in the
 * product page's own rule:
 *
 * - a control in the flow takes its real size below `sm`
 *   (`max-sm:min-h-11`, with `max-sm:min-w-11` where it is icon-only);
 * - a control floating over a picture keeps its size and takes a 44px hit
 *   area from an `::after` (`after:absolute after:-inset-2`), which an
 *   `overflow-hidden` ancestor must not clip: the control sits at least
 *   8px inside it.
 *
 * Each entry names the control by its tag and a fragment of its attributes,
 * and where the classes are written (its `class`, or a bound prop).
 */
interface Target {
  file: string
  tag: string
  /** A fragment of the element's attributes that picks it out of the file. */
  has: string
  /** `class`, or the name of the bound prop that carries the classes (`ui`, `button`, …). */
  where?: string
  /** `size`: the two `max-sm:min-*-11`; `height`: `max-sm:min-h-11` alone; `hit`: the ::after. */
  kind: 'size' | 'height' | 'hit'
}

const TARGETS: Target[] = [
  { file: 'Product/Card.vue', tag: 'LazyButtonProductAddToCart', has: 'icon-only', kind: 'size' },
  { file: 'Product/Card.vue', tag: 'LazyButtonProductAddToFavourite', has: 'favourite-delete', kind: 'hit' },
]

const SIZE = /(?<![\w:-])(?:max-sm:)?min-h-11(?![\w-])/
const WIDTH = /(?<![\w:-])(?:max-sm:)?min-w-11(?![\w-])/

function find({ file, tag, has }: Target): ElementNode[] {
  const found: ElementNode[] = []
  walkElements(sfcTemplate(resolve(COMPONENTS, file)), (node) => {
    if (node.tag === tag && node.props.map(prop => prop.loc.source).join(' ').includes(has)) found.push(node)
  })
  return found
}

function classesFor(node: ElementNode, where = 'class'): string {
  return where === 'class' ? classesOf(node) : (boundAttribute(node, where) ?? '')
}

describe('the default design\'s controls are 44px targets on a phone', () => {
  it.each(TARGETS)('$file <$tag $has>', (target) => {
    const nodes = find(target)
    expect(nodes, 'the control exists once').toHaveLength(1)
    const classes = classesFor(nodes[0]!, target.where)

    if (target.kind === 'hit') expect(classes).toContain('after:-inset-2')
    else {
      expect(classes).toMatch(SIZE)
      if (target.kind === 'size') expect(classes).toMatch(WIDTH)
    }
  })
})
