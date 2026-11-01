import * as z from 'zod'

/** A swipeable rail of products. */
export default defineBlock({
  type: 'products_slider',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    ...builderField.productRail(24),
  }),
  translatable: ['/title', '/heading', '/subheading', '/ctaText'],
  refs: { '/categoryId': 'category' },
})
