import * as z from 'zod'

/** The products this visitor looked at last; draws nothing until they have looked at one. */
export default defineBlock({
  type: 'recently_viewed',
  version: 1,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    title: builderField.text(200).optional(),
    heading: builderField.text(200).optional(),
  }),
  translatable: ['/title', '/heading'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading', 'title'], category: 'products' },
})
