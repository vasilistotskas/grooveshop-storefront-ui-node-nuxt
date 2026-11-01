import * as z from 'zod'

/** The latest blog posts as a carousel. */
export default defineBlock({
  type: 'blog_posts_carousel',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    ...builderField.blogRail(),
    count: builderField.integer(1, 12).optional(),
  }),
  translatable: ['/heading', '/subheading', '/ctaText'],
  refs: { '/categoryId': 'blogCategory' },
})
