import * as z from 'zod'

/** One ask, alone on a band. The colour is a surface or the store's own hex. */
export default defineBlock({
  type: 'cta_banner',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    heading: builderField.text(200).optional(),
    description: builderField.text(1000).optional(),
    buttonText: builderField.text(100).optional(),
    buttonLink: builderField.link().optional(),
    backgroundColor: builderField.hexColor().optional(),
    surface: builderField.surface().optional(),
  }),
  translatable: ['/heading', '/description', '/buttonText'],
  upgrade: { 1: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading'], category: 'store' },
})
