import * as z from 'zod'

/** One question and its answer. */
export default defineBlock({
  type: 'faq_item',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    question: builderField.requiredText(200),
    answer: builderField.requiredText(2000),
  }),
  translatable: ['/question', '/answer'],
})
