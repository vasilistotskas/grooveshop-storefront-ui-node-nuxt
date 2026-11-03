import * as z from 'zod'

/** A full-page content section of webside's own design: its copy is the design's, so it takes no settings. */
export default defineBlock({
  type: 'vision_content',
  version: 1,
  kinds: ['section'],
  designs: ['webside'],
  schema: z.object({}),
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { category: 'content' },
})
