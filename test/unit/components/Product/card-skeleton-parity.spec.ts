import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * The product skeleton and the product card must reserve the SAME
 * space.
 *
 * When they drift the grid jumps the moment the products arrive —
 * every card below the fold moves, which is the layout shift the
 * skeleton was added to prevent. The two files are read as source
 * rather than mounted because the question is about the classes they
 * declare, and mounting the card needs a session, a cart and a pricing
 * registry to answer it.
 */
const root = resolve(__dirname, '../../../..')

function source(file: string) {
  return readFileSync(resolve(root, file), 'utf8')
}

const card = source('app/components/Product/Card.vue')
const skeleton = source('app/components/Product/CardSkeleton.vue')

describe('product card / skeleton parity', () => {
  it('reserves the same image aspect ratio', () => {
    const aspectOf = (src: string) => src.match(/aspect-[\w[\]/.-]+/)?.[0]

    expect(aspectOf(skeleton)).toBeDefined()
    expect(aspectOf(skeleton)).toBe(aspectOf(card))
  })

  it('draws the same frame', () => {
    // The rounding and the ring are what make a card a card; a
    // skeleton without them is a grey rectangle in a row of cards.
    for (const frame of ['rounded-xl', 'ring ring-default', 'bg-default']) {
      expect(card).toContain(frame)
      expect(skeleton).toContain(frame)
    }
  })

  it('renders as the same element by default, and follows it out of a list', () => {
    for (const src of [card, skeleton]) {
      expect(src).toMatch(/as: \{ type: String, required: false, default: 'li' \}/)
      expect(src).toContain(':is="as"')
    }
  })
})
