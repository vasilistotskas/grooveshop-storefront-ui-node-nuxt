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
    /** The small line above the heading. */
    eyebrow: builderField.text(100).optional(),
    /** How many of the products a phone shows, the first ones; left out, all of them. */
    phoneLimit: builderField.integer(1, 24).optional(),
    /** The categories a last tile of the grid lists, on a desk; left out, no tile. */
    categories: builderField.query('category', { onEmpty: 'empty', maxLimit: 12 }).optional(),
  }),
  translatable: ['/eyebrow', '/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeProductRail({ ordering: 'featured', limit: 8 }, 24), 2: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { products: { mode: 'filter', ordering: 'mostViewed', limit: 8 } } }],
  editor: { title: ['heading'], category: 'products' },
})
