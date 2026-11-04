import * as z from 'zod'

/** A grid of products. */
export default defineBlock({
  type: 'products_grid',
  version: 2,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    title: builderField.text(200).optional(),
    // A grid listed up to 48 until a list was limited to what a page is meant to carry (24).
    ...builderField.productRail(24),
  }),
  translatable: ['/title', '/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeProductRail({ ordering: 'featured', limit: 8 }, 24) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { products: { mode: 'filter', ordering: 'mostViewed', limit: 8 } } }],
  editor: { title: ['title'], category: 'products' },
})
