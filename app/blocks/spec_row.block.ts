import * as z from 'zod'

/** One label and value of a spec card. */
export default defineBlock({
  type: 'spec_row',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    label: builderField.requiredText(40),
    value: builderField.requiredText(80),
  }),
  translatable: ['/label', '/value'],
})
