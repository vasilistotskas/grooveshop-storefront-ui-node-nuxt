import * as z from 'zod'

/** Vertical space between two bands. */
export default defineBlock({
  type: 'spacer',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    height: z.enum(['sm', 'lg', 'xl']).optional(),
  }),
  upgrade: { 1: upgradeLeavingOutDefaults({ '/height': 'md' }) },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { category: 'layout' },
})
