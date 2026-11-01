import * as z from 'zod'

/** Prose on a band of its own. The HTML is sanitised on save and again before it reaches the page. */
export default defineBlock({
  type: 'rich_text',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    content: builderField.richText(20000).optional(),
  }),
  translatable: ['/title', '/content'],
})
