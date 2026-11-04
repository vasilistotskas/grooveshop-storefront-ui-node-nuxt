import * as z from 'zod'

/** The store's categories as a rail, a grid or image tiles: the main ones, or the children of one category. */
export default defineBlock({
  type: 'product_categories',
  version: 2,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    layout: z.enum(['slider', 'grid', 'tiles']).optional(),
    categories: builderField.query('category', { onEmpty: 'hide' }),
  }),
  translatable: ['/heading'],
  upgrade: { 1: upgradeProductCategories(8) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { categories: { mode: 'roots', limit: 8 } } }],
  editor: { title: ['heading'], category: 'products' },
})
