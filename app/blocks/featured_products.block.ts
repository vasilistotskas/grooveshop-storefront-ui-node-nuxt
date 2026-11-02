import * as z from 'zod'

/** A rail of products with the number of columns the page wants. */
export default defineBlock({
  type: 'featured_products',
  version: 1,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    title: builderField.text(200).optional(),
    ...builderField.productRail(24),
    columns: builderField.integer(1, 6).optional(),
  }),
  translatable: ['/title', '/heading', '/subheading', '/ctaText'],
  refs: { '/categoryId': 'category' },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'], category: 'products' },
})
