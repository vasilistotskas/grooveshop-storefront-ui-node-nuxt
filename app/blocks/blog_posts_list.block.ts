import * as z from 'zod'

/**
 * Blog posts as a list: the same band as the grid, which a store may draw differently.
 *
 * `loadMore` adds a button that reads the next posts of the same list below
 * the ones the band came with (a rule's `limit` is the size of each page). It
 * is optional and absent means off, so no version moves: a node written
 * before it is valid as it is.
 */
export default defineBlock({
  type: 'blog_posts_list',
  version: 2,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object({
    ...builderField.blogRail(24),
    loadMore: builderField.boolean().optional(),
  }),
  translatable: ['/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeBlogRail(3, 24) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { posts: { mode: 'filter', ordering: 'newest', limit: 6 } } }],
  editor: { category: 'blog' },
})
