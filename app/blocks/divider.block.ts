import * as z from 'zod'

/** A rule between two bands; `thread` is the woven strip drawn from the store's own colours. */
export default defineBlock({
  type: 'divider',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    variant: z.enum(['line', 'thread']).optional(),
  }),
})
