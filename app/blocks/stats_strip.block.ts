import * as z from 'zod'

/** The proof row as a band of its own, for a page whose hero is a photo or a carousel. */
export default defineBlock({
  type: 'stats_strip',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.mutedSurface().optional(),
  }),
  upgrade: { 1: upgradeLeavingOutDefaults({ '/surface': 'muted' }) },
  limits: { maxBlocks: 4 },
  children: { allowed: ['stat'], maxDepth: 1 },
  childList: { stat: 'items' },
  presets: [{ id: BUILDER_DEFAULT_PRESET, blocks: Array.from({ length: 3 }, () => ({ type: 'stat' })) }],
  editor: { category: 'trust' },
})
