import * as z from 'zod'

/** Blog posts as a list: the same band as the grid, asked for with a page size. */
export default defineBlock({
  type: 'blog_posts_list',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    ...builderField.blogRail(),
    pageSize: builderField.integer(1, 24).optional(),
  }),
  translatable: ['/heading', '/subheading', '/ctaText'],
  refs: { '/categoryId': 'blogCategory' },
})
