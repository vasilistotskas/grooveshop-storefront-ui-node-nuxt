import * as z from 'zod'

/** A grid of products. */
export default defineBlock({
  type: 'products_grid',
  version: 1,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    title: builderField.text(200).optional(),
    ...builderField.productRail(48),
  }),
  translatable: ['/title', '/heading', '/subheading', '/ctaText'],
  refs: { '/categoryId': 'category' },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'], category: 'products' },
})
