import * as z from 'zod'

/** The store search field, on a band. */
export default defineBlock({
  type: 'search_bar',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
  }),
  translatable: ['/title'],
})
