import * as z from 'zod'

/** The store's categories as a rail, a grid or image tiles: the roots, or the children of one category. */
export default defineBlock({
  type: 'product_categories',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    layout: z.enum(['slider', 'grid', 'tiles']).optional(),
    parentId: builderField.id().optional(),
    limit: builderField.integer(1, 24).optional(),
  }),
  translatable: ['/heading'],
  refs: { '/parentId': 'category' },
})
