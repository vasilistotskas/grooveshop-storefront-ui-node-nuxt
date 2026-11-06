import * as z from 'zod'

/** A rail of products, ordered by default by what is looked at most. */
export default defineBlock({
  type: 'featured_products',
  version: 3,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    ...builderField.productRail(24),
  }),
  translatable: ['/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeProductRail({ ordering: 'featured', limit: 8 }, 24), 2: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { products: { mode: 'filter', ordering: 'mostViewed', limit: 8 } } }],
  editor: { title: ['heading'], category: 'products' },
})
