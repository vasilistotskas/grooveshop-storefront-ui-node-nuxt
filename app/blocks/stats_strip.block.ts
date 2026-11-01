import * as z from 'zod'

/** The proof row as a band of its own, for a page whose hero is a photo or a carousel. */
export default defineBlock({
  type: 'stats_strip',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.surface().optional(),
  }),
  limits: { maxBlocks: 4 },
  children: { allowed: ['stat'], maxDepth: 1 },
  childList: { stat: 'items' },
})
