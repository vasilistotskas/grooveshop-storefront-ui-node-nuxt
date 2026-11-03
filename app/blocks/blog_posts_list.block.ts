import * as z from 'zod'

/** Blog posts as a list: the same band as the grid, which a store may draw differently. */
export default defineBlock({
  type: 'blog_posts_list',
  version: 2,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object(builderField.blogRail(24)),
  translatable: ['/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeBlogRail(3, 24) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { posts: { mode: 'filter', ordering: 'newest', limit: 6 } } }],
  editor: { category: 'blog' },
})
