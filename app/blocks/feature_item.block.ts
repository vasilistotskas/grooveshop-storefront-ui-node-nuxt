import * as z from 'zod'

/** One cell of a features grid: a title, a line and an icon. */
export default defineBlock({
  type: 'feature_item',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    title: builderField.requiredText(100),
    text: builderField.text(500).optional(),
    icon: builderField.icon(100).optional(),
  }),
  translatable: ['/title', '/text'],
})
