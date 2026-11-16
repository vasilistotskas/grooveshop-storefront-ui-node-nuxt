import { describe, expect, it } from 'vitest'
import { upgradeNode } from '~~/shared/builder/upgrade'
import { realBlocks } from '~~/test/helpers/realBlocks'

/**
 * Version 1 of a hero slide named its product `productId`; version 2 states
 * it as the `product` the component receives. A slide that named none still
 * names none.
 */
const slide = realBlocks.find(definition => definition.type === 'hero_slide')!

const upgraded = (settings: Record<string, unknown>) => {
  const node = upgradeNode({ type: 'hero_slide@1', settings }, slide)
  return { node, parsed: slide.schema.safeParse(node.settings) }
}

describe('hero_slide, version 1 to 2', () => {
  it('names the product a slide shows as a product, and keeps the rest, which a store may translate', () => {
    const { node, parsed } = upgraded({ imageUrl: 'https://assets.example.test/a.avif', heading: 'Φόρτιση', productId: 7 })

    expect(node.type).toBe('hero_slide@2')
    expect(node.settings).toEqual({ imageUrl: 'https://assets.example.test/a.avif', heading: 'Φόρτιση', product: 7 })
    expect(parsed.success).toBe(true)
  })

  it('leaves a slide that named no product without one', () => {
    const { node, parsed } = upgraded({ imageUrl: 'https://assets.example.test/a.avif' })

    expect(node.settings).toEqual({ imageUrl: 'https://assets.example.test/a.avif' })
    expect(parsed.success).toBe(true)
  })
})
