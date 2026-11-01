import * as z from 'zod'

/** A stated principle with the reason under it: not a testimonial. */
export default defineBlock({
  type: 'pull_quote',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    quote: builderField.text(300).optional(),
    text: builderField.text(1000).optional(),
    attribution: builderField.text(120).optional(),
  }),
  translatable: ['/quote', '/text', '/attribution'],
})
