import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  COMPONENTS,
  boundAttribute,
  callsIn,
  classesOf,
  isElement,
  propertyOf,
  sfcTemplate,
  staticText,
  walkElements,
} from '../../helpers/sourceText'

/**
 * The product skeleton and the product card must reserve the SAME
 * space.
 *
 * When they drift the grid jumps the moment the products arrive —
 * every card below the fold moves, which is the layout shift the
 * skeleton was added to prevent. The two files are compared as parsed
 * templates rather than mounted because the question is about the
 * classes they declare, and mounting the card needs a session, a cart
 * and a pricing registry to answer it. The skeleton's own rendering is
 * `test/nuxt/components/Product/CardSkeleton.spec.ts`.
 */
const CARD = resolve(COMPONENTS, 'Product/Card.vue')
const SKELETON = resolve(COMPONENTS, 'Product/CardSkeleton.vue')

const tokens = (classes: string) => new Set(classes.split(/[\s'"`]+/).filter(Boolean))

function root(file: string) {
  const node = sfcTemplate(file)?.children.find(isElement)
  if (!node) throw new Error(`${file} has no root element`)
  return node
}

/** Every `aspect-*` class in the template, in order. */
function aspects(file: string): string[] {
  const out: string[] = []
  walkElements(sfcTemplate(file), (node) => {
    for (const token of tokens(classesOf(node))) if (/^aspect-/.test(token)) out.push(token)
  })
  return out
}

/** The literal default of the `as` prop in `defineProps({ … })`. */
function asDefault(file: string): string | undefined {
  const [props] = callsIn(file, /^defineProps$/)
  return staticText(propertyOf(propertyOf(props?.call.arguments[0], 'as'), 'default'))
}

describe('product card / skeleton parity', () => {
  it('reserves the same image aspect ratio, in one place each', () => {
    // Exactly one each: a second aspect box would make "the" image
    // ratio ambiguous, so the comparison would silently pick one.
    const card = aspects(CARD)
    expect(card).toHaveLength(1)
    expect(aspects(SKELETON)).toEqual(card)
  })

  it('draws the same frame on its root element', () => {
    // The rounding and the ring are what make a card a card; a
    // skeleton without them is a grey rectangle in a row of cards.
    for (const file of [CARD, SKELETON]) {
      const frame = tokens(classesOf(root(file)))
      for (const token of ['rounded-xl', 'ring', 'ring-default', 'bg-default']) {
        expect(frame, `${file} root lost ${token}`).toContain(token)
      }
    }
  })

  it('renders as the same element by default, and follows it out of a list', () => {
    for (const file of [CARD, SKELETON]) {
      expect(root(file).tag).toBe('component')
      expect(boundAttribute(root(file), 'is')).toBe('as')
    }
    expect(asDefault(CARD)).toBe('li')
    expect(asDefault(SKELETON)).toBe(asDefault(CARD))
  })
})
