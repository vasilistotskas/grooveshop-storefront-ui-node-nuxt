import * as z from 'zod'

/** A swipeable rail of products. */
export default defineBlock({
  type: 'products_slider',
  version: 2,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    title: builderField.text(200).optional(),
    ...builderField.productRail(24),
  }),
  translatable: ['/title', '/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeProductRail({ ordering: 'newest', limit: 8 }, 24) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { products: { mode: 'filter', ordering: 'newest', limit: 8 } } }],
  editor: { title: ['title'], category: 'products' },
})
