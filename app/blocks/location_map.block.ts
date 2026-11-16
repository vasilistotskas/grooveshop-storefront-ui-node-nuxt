import * as z from 'zod'

/** The store's location: its own pin, and an https embed when the store has one. */
export default defineBlock({
  type: 'location_map',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
    embedUrl: builderField.httpsUrl().optional(),
    address: builderField.text(300).optional(),
  }),
  upgrade: { 1: upgradeLeavingOutDefaults({ '/surface': 'default' }) },
  translatable: ['/title', '/address'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'], category: 'store' },
})
