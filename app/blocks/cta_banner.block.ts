import * as z from 'zod'

/** One ask, alone on a band. The colour is a surface or the store's own hex. */
export default defineBlock({
  type: 'cta_banner',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    heading: builderField.text(200).optional(),
    description: builderField.text(1000).optional(),
    buttonText: builderField.text(100).optional(),
    buttonLink: builderField.link().optional(),
    backgroundColor: builderField.hexColor().optional(),
    surface: builderField.surface().optional(),
  }),
  translatable: ['/title', '/heading', '/description', '/buttonText'],
})
