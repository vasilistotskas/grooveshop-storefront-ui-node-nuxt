import * as z from 'zod'

/** A grid of products. */
export default defineBlock({
  type: 'products_grid',
  version: 3,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    // A grid listed up to 48 until a list was limited to what a page is meant to carry (24).
    ...builderField.productRail(24),
  }),
  translatable: ['/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeProductRail({ ordering: 'featured', limit: 8 }, 24), 2: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { products: { mode: 'filter', ordering: 'mostViewed', limit: 8 } } }],
  editor: { title: ['heading'], category: 'products' },
})
