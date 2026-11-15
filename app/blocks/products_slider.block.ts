import * as z from 'zod'

/** A swipeable rail of products. */
export default defineBlock({
  type: 'products_slider',
  version: 3,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    ...builderField.productRail(24),
  }),
  translatable: ['/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeProductRail({ ordering: 'newest', limit: 8 }, 24), 2: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { products: { mode: 'filter', ordering: 'newest', limit: 8 } } }],
  editor: { title: ['heading'], category: 'products' },
})
