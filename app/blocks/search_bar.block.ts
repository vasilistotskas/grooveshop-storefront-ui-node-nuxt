import * as z from 'zod'

/** The store search field, on a band: it searches the catalogue, so a store without one is not offered it and draws none. */
export default defineBlock({
  type: 'search_bar',
  version: 1,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    title: builderField.text(200).optional(),
  }),
  translatable: ['/title'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'], category: 'products' },
})
