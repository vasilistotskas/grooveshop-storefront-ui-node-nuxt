import * as z from 'zod'

/** The latest blog posts as a grid. */
export default defineBlock({
  type: 'blog_posts_grid',
  version: 3,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object({
    ...builderField.blogRail(24),
    /** Below `sm`: a list of compact rows; left out, the row to swipe. From `sm` up the same either way. */
    phoneLayout: z.enum(['list']).optional(),
    /** The small line above the heading. */
    eyebrow: builderField.text(100).optional(),
    /** How many of the posts a phone shows, the first ones; left out, all of them. */
    phoneLimit: builderField.integer(1, 24).optional(),
    /**
     * `feature`: one card, its copy, icon and button beside a few posts (on
     * a phone the posts as rows and the button last), the card in the
     * section's colour scheme. Left out, a band of cards.
     */
    layout: z.enum(['feature']).optional(),
    /** The icon on the feature card's tile. */
    icon: builderField.icon().optional(),
    /** `bold`: the heavier look of the home board (bigger, bolder headings, an accent eyebrow, text links). Left out, the look it always had. */
    look: z.enum(['bold']).optional(),
  }),
  translatable: ['/eyebrow', '/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeBlogRail(3, 24), 2: upgradeIconSetting },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { posts: { mode: 'filter', ordering: 'newest', limit: 3 } } }],
  editor: { category: 'blog' },
})
