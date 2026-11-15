import * as z from 'zod'

/** A rule between two bands; `thread` is the woven strip drawn from the store's own colours. */
export default defineBlock({
  type: 'divider',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    variant: z.enum(['thread']).optional(),
  }),
  upgrade: { 1: upgradeLeavingOutDefaults({ '/variant': 'line' }) },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { category: 'layout' },
})
