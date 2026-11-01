import * as z from 'zod'

/** The opening hours, read from the store's own settings. */
export default defineBlock({
  type: 'business_hours',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
  }),
  translatable: ['/title'],
})
