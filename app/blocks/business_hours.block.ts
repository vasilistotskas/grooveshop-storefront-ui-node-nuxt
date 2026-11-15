import * as z from 'zod'

/** The opening hours, read from the store's own settings. */
export default defineBlock({
  type: 'business_hours',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
  }),
  upgrade: { 1: upgradeLeavingOutDefaults({ '/surface': 'default' }) },
  translatable: ['/title'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'], category: 'store' },
})
