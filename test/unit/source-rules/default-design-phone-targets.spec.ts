import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import type { ElementNode } from '../../helpers/sourceText'
import { COMPONENTS, boundAttribute, classesOf, readSource, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * The default design's shared chrome and cards are 44px targets on a phone
 * (the real-browser check, 2026-11-12, measured 28-36px). happy-dom lays
 * nothing out, so the classes that size them are the contract, as in the
 * product page's own rule:
 *
 * - a control in the flow takes its real size below `sm`
 *   (`max-sm:min-h-11`, with `max-sm:min-w-11` where it is icon-only);
 * - a control floating over a picture keeps its size and takes a 44px hit
 *   area from an `::after` (`after:absolute after:-inset-*`, 8px out from a 28-36px control, 14px from an icon), which an
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
  { file: 'Chrome/MobileMenu.vue', tag: 'UNavigationMenu', has: 't(\'navigation\')', where: 'ui', kind: 'height' },
  { file: 'Chrome/MobileMenu.vue', tag: 'UColorModeSelect', has: 'neutral', where: 'ui', kind: 'height' },
  { file: 'Language/Switcher.vue', tag: 'USelectMenu', has: 'value-key', where: 'ui', kind: 'height' },
  { file: 'Chrome/Navbar.vue', tag: 'UButton', has: 'bars-3', where: 'class', kind: 'size' },
  { file: 'Search/Input.vue', tag: 'UButton', has: 'lg:hidden', where: 'class', kind: 'size' },
  { file: 'Cart/Drawer.vue', tag: 'UButton', has: 'i-lucide-x', where: 'class', kind: 'size' },
  { file: 'Cart/Drawer.vue', tag: 'ButtonProductAddToCart', has: 'icon-only', where: 'class', kind: 'size' },
  { file: 'Cart/ItemCard.vue', tag: 'UButton', has: 'trash-2', where: 'class', kind: 'size' },
  { file: 'Quantity/Selector.vue', tag: 'UInputNumber', has: 'optimisticQuantity', where: 'increment', kind: 'size' },
  { file: 'Quantity/Selector.vue', tag: 'UInputNumber', has: 'optimisticQuantity', where: 'decrement', kind: 'size' },
  { file: 'Products/CategoryChips.vue', tag: 'UButton', has: 'back_to', where: 'class', kind: 'height' },
  { file: 'Products/Toolbar.vue', tag: 'UButton', has: 'open_filters', where: 'class', kind: 'height' },
  { file: 'Products/Toolbar.vue', tag: 'UButton', has: 'clear_filters', where: 'class', kind: 'height' },
  { file: 'Products/Filters/ActiveFilters.vue', tag: 'UButton', has: 'clear_all', where: 'class', kind: 'height' },
  { file: 'Products/Filters/ActiveFilters.vue', tag: 'button', has: 'remove', where: 'class', kind: 'size' },
  { file: 'Products/Pagination.vue', tag: 'UPagination', has: 'items-per-page', where: 'ui', kind: 'size' },
  { file: 'Pagination/PageNumber.vue', tag: 'UPagination', has: 'total', where: 'ui', kind: 'size' },
  { file: 'Pagination/Cursor.vue', tag: 'UButton', has: 'load.more', where: 'class', kind: 'height' },
  { file: 'Chrome/Footer.vue', tag: 'UColorModeSelect', has: 'neutral', where: 'ui', kind: 'height' },
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

const KINDS: Record<Target['kind'], RegExp[]> = {
  size: [SIZE, WIDTH],
  height: [SIZE],
  hit: [/after:absolute[\s\S]*after:-inset-\d/],
}

describe('the default design controls are 44px targets on a phone', () => {
  it.each(TARGETS)('$file <$tag $has>', (target) => {
    const nodes = find(target)
    expect(nodes, 'the control exists once').toHaveLength(1)
    const classes = classesFor(nodes[0]!, target.where)

    expect(KINDS[target.kind].filter(pattern => !pattern.test(classes)), 'the classes it lacks').toEqual([])
  })

  it('Chrome/MobileMenu.vue draws every row of the catalogue tree 44px tall', () => {
    const source = readSource(resolve(COMPONENTS, 'Chrome/MobileMenu.vue'))

    expect(source).toMatch(/class: 'h-11 font-medium'/)
    expect(source).toMatch(/link: `\s*h-11 /)
    expect(source).not.toMatch(/(?<![\w-])h-10(?![\w-])/)
  })

  it('Cart/CartButton.vue gives the header cart button, in both of its forms, the phone size', () => {
    expect(readSource(resolve(COMPONENTS, 'Cart/CartButton.vue'))).toMatch(/square: true,\s*class: 'max-sm:min-h-11 max-sm:min-w-11'/)
  })

  it('Chrome/Footer.vue stacks its 44px link rows with no gap between them on a phone', () => {
    const source = readSource(resolve(COMPONENTS, 'Chrome/Footer.vue'))

    const flat = source.replace(/\s+/g, ' ')

    expect(flat).toContain('list: ` mt-3 space-y-3 max-sm:space-y-0 `')
    expect(flat).toContain('<ul class="flex flex-col pb-1">')
    expect(flat).toContain('flex flex-wrap gap-5 text-sm max-sm:gap-y-0')
  })
})
