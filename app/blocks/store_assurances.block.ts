import * as z from 'zod'

/**
 * The store's shopping promises (delivery, free shipping, returns, ways to
 * pay), read from the data the store already publishes, never typed in. A
 * browse-only store promises no delivery, so it needs the cart.
 */
export default defineBlock({
  type: 'store_assurances',
  version: 2,
  kinds: ['section'],
  feature: 'cart',
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    /**
     * `card`: the promises on one raised card that rises over the bottom
     * edge of the band above it on a desk, and as a two-by-two grid of small
     * cards on a phone. Left out, a band of its own.
     */
    layout: z.enum(['card']).optional(),
  }),
  upgrade: { 1: upgradeLeavingOutDefaults({ '/surface': 'default' }) },
  translatable: ['/heading'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading'], category: 'trust' },
})
