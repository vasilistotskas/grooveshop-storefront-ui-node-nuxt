import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import type { ElementNode } from '../../helpers/sourceText'
import { COMPONENTS, boundAttribute, classesOf, readSource, sfcTemplate, walkElements } from '../../helpers/sourceText'

/**
 * The default design's shared chrome and cards, and webside's cart line (which the
 * product-page rule does not reach: it holds the product page of both designs),
 * are 44px targets on a phone
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
  { file: 'variants/webside/Cart/ItemCard.vue', tag: 'UButton', has: 'i-fa6-solid-trash', where: 'class', kind: 'size' },
  { file: 'variants/webside/Quantity/Selector.vue', tag: 'UInputNumber', has: 'optimisticQuantity', where: 'increment', kind: 'size' },
  { file: 'variants/webside/Quantity/Selector.vue', tag: 'UInputNumber', has: 'optimisticQuantity', where: 'decrement', kind: 'size' },
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

  it('Products/Pagination.vue lets its 44px items wrap instead of overflowing a narrow screen', () => {
    const [list] = find({ file: 'Products/Pagination.vue', tag: 'UPagination', has: 'items-per-page', kind: 'size' })

    expect(boundAttribute(list!, 'ui')).toMatch(/list: 'flex-wrap /)
  })

  // The browser is the real check (the cart page scrolled sideways by 62px at 320, 22px at 360):
  // a grid's implicit column is as wide as its widest child's min-content, and a button's one-line
  // label is 326px, so the column is clamped and the sentence wraps.
  const flat = (file: string) => readSource(resolve(COMPONENTS, file)).replace(/\s+/g, ' ')

  it.each([
    'Storefront/Cart.vue',
    'Storefront/Checkout.vue',
    'variants/webside/Storefront/Cart.vue',
  ])('%s holds its phone column at the viewport, whatever the min-content of a child', (file) => {
    expect(flat(file)).toContain('grid-cols-[minmax(0,1fr)]')
  })

  it.each([
    'Checkout/CouponPicker.vue',
    'variants/webside/Checkout/CouponPicker.vue',
  ])('%s draws its coupon sentence in a span that wraps, not a truncated button label', (file) => {
    const source = flat(file)

    expect(source).toContain('<span class="min-w-0 text-start">{{ triggerLabel }}</span>')
    expect(source).not.toContain(':label="triggerLabel"')
  })

  it('Cart/ItemCard.vue lets the stepper, not the 44px button, give way at the narrowest drawer', () => {
    const source = flat('Cart/ItemCard.vue')

    expect(source).toContain('max-sm:min-w-0 max-sm:shrink')
    expect(source).toContain('max-sm:gap-2')
  })

  it('variants/webside/Cart/ItemCard.vue wraps its row on a phone so the 128px stepper and the 44px bin fit its 192px column', () => {
    const source = flat('variants/webside/Cart/ItemCard.vue')

    expect(source).toContain('flex flex-wrap items-end justify-between')
    expect(source).toContain('max-sm:w-32')
  })

  // The browser is the real check (2026-11-12, 320px): a `1fr` track is as wide as the
  // min-content of what it holds, so a drawer footer and a checkout header whose children
  // do not shrink were wider than the screen (7px and 8px).
  it('Cart/Drawer.vue shares its footer row between two buttons that may shrink, with labels that wrap', () => {
    const source = flat('Cart/Drawer.vue')

    expect(source).toContain('grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]')
    expect(source).not.toContain(':label="hasStockIssues')
    expect(source).not.toMatch(/:label="t\('view_cart'\)"/)
  })

  it('Chrome/CheckoutHeader.vue lets its side columns shrink and drops the cart word below sm', () => {
    const source = flat('Chrome/CheckoutHeader.vue')

    expect(source).toContain('grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]')
    expect(source).toContain('max-sm:sr-only lg:hidden')
  })
})
