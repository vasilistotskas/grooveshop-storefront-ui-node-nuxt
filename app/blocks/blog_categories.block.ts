import * as z from 'zod'

/** The blog's categories. */
export default defineBlock({
  type: 'blog_categories',
  version: 2,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object({
    title: builderField.text(200).optional(),
    categories: builderField.query('blogCategory', { onEmpty: 'hide' }),
  }),
  translatable: ['/title'],
  upgrade: { 1: upgradeBlogCategories(10) },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { categories: { limit: 10 } } }],
  editor: { title: ['title'], category: 'blog' },
})
