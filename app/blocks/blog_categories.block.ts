import * as z from 'zod'

/** The blog's categories, as a rail (`slider`, the default) or as tiles with each category's post count. */
export default defineBlock({
  type: 'blog_categories',
  version: 2,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object({
    /** The small line above the heading. */
    eyebrow: builderField.text(100).optional(),
    title: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    layout: z.enum(['slider', 'tiles']).optional(),
    categories: builderField.query('blogCategory', { onEmpty: 'hide' }),
  }),
  translatable: ['/eyebrow', '/title', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeBlogCategories(10) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { categories: { limit: 10 } } }],
  editor: { title: ['title'], category: 'blog' },
})
