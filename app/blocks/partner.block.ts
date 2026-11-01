import * as z from 'zod'

/** One partner of a strip: a name and where it links. */
export default defineBlock({
  type: 'partner',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    name: builderField.requiredText(60),
    href: builderField.link().optional(),
  }),
})
