import * as z from 'zod'

/** The store's location: its own pin, and an https embed when the store has one. */
export default defineBlock({
  type: 'location_map',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
    embedUrl: builderField.httpsUrl().optional(),
    address: builderField.text(300).optional(),
  }),
  translatable: ['/title', '/address'],
})
