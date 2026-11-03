import * as z from 'zod'

/** The latest blog posts as a grid. */
export default defineBlock({
  type: 'blog_posts_grid',
  version: 2,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object(builderField.blogRail(24)),
  translatable: ['/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeBlogRail(3, 24) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { posts: { mode: 'filter', ordering: 'newest', limit: 3 } } }],
  editor: { category: 'blog' },
})
