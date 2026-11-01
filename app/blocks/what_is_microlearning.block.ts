import * as z from 'zod'

/** A full-page content section of webside's own design: its copy is the design's, so it takes no settings. */
export default defineBlock({
  type: 'what_is_microlearning',
  version: 1,
  kinds: ['section'],
  schema: z.object({}),
})
