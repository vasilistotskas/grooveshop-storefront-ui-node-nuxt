import * as z from 'zod'

/** The latest blog posts as a grid. */
export default defineBlock({
  type: 'blog_posts_grid',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    ...builderField.blogRail(),
    count: builderField.integer(1, 24).optional(),
  }),
  translatable: ['/heading', '/subheading', '/ctaText'],
  refs: { '/categoryId': 'blogCategory' },
})
