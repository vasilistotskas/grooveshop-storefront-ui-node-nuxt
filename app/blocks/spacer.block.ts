import * as z from 'zod'

/** Vertical space between two bands. */
export default defineBlock({
  type: 'spacer',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    height: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  }),
})
