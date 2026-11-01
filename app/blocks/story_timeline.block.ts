import * as z from 'zod'

/** The store's story as a timeline. */
export default defineBlock({
  type: 'story_timeline',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    surface: builderField.surface().optional(),
  }),
  translatable: ['/title', '/heading', '/subheading'],
  limits: { maxBlocks: 20 },
  children: { allowed: ['timeline_entry'], maxDepth: 1 },
  childList: { timeline_entry: 'items' },
})
