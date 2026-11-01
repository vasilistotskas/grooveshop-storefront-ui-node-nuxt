import * as z from 'zod'

/** A product tier's comparison card: a name, a model line and a short table of rows. */
export default defineBlock({
  type: 'spec_card',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    label: builderField.text(40).optional(),
    name: builderField.requiredText(60),
    subtitle: builderField.text(120).optional(),
  }),
  translatable: ['/label', '/name', '/subtitle'],
  limits: { maxBlocks: 8 },
  children: { allowed: ['spec_row'], maxDepth: 1 },
  childList: { spec_row: 'rows' },
})
