import * as z from 'zod'

/** The store's story as a timeline. */
export default defineBlock({
  type: 'story_timeline',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    surface: builderField.surface().optional(),
  }),
  translatable: ['/heading', '/subheading'],
  upgrade: { 1: upgradeTitleIntoHeading },
  limits: { maxBlocks: 20 },
  children: { allowed: ['timeline_entry'], maxDepth: 1 },
  childList: { timeline_entry: 'items' },
  presets: [{ id: BUILDER_DEFAULT_PRESET, blocks: Array.from({ length: 3 }, () => ({ type: 'timeline_entry' })) }],
  editor: { title: ['heading'], category: 'content' },
})
