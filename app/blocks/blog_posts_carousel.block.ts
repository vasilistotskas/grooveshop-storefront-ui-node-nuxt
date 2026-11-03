import * as z from 'zod'

/** The latest blog posts as a carousel. */
export default defineBlock({
  type: 'blog_posts_carousel',
  version: 2,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object(builderField.blogRail(12)),
  translatable: ['/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeBlogRail(6, 12) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { posts: { mode: 'filter', ordering: 'newest', limit: 6 } } }],
  editor: { category: 'blog' },
})
