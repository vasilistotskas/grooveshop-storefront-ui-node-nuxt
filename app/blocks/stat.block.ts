import * as z from 'zod'

/** One figure of a proof row ("2.500+" over "orders"): a child of the hero banner, the page hero and the stats strip. */
export default defineBlock({
  type: 'stat',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    value: builderField.requiredText(12),
    label: builderField.requiredText(80),
  }),
  translatable: ['/value', '/label'],
})
