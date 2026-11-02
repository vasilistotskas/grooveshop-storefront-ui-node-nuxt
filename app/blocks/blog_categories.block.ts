import * as z from 'zod'

/** The blog's categories. */
export default defineBlock({
  type: 'blog_categories',
  version: 1,
  kinds: ['section'],
  feature: 'blog',
  schema: z.object({
    title: builderField.text(200).optional(),
  }),
  translatable: ['/title'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'], category: 'blog' },
})
