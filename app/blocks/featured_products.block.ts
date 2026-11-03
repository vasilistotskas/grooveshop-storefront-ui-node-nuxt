import * as z from 'zod'

/** A rail of products, ordered by default by what is looked at most. */
export default defineBlock({
  type: 'featured_products',
  version: 2,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    title: builderField.text(200).optional(),
    ...builderField.productRail(24),
  }),
  translatable: ['/title', '/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeProductRail({ ordering: 'featured', limit: 8 }, 24) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { products: { mode: 'filter', ordering: 'mostViewed', limit: 8 } } }],
  editor: { title: ['title'], category: 'products' },
})
