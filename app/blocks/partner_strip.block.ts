import * as z from 'zod'

/** The partners and brands a store works with, in a row. */
export default defineBlock({
  type: 'partner_strip',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    label: builderField.text(80).optional(),
  }),
  translatable: ['/title', '/label'],
  limits: { maxBlocks: 12 },
  children: { allowed: ['partner'], maxDepth: 1 },
  childList: { partner: 'items' },
})
