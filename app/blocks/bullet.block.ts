import * as z from 'zod'

/** One bullet point of a text band. */
export default defineBlock({
  type: 'bullet',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    text: builderField.requiredText(300),
  }),
  translatable: ['/text'],
})
