import * as z from 'zod'

/** One ask, alone on a band. The colour is a surface or the store's own hex. */
export default defineBlock({
  type: 'cta_banner',
  version: 3,
  kinds: ['section'],
  schema: z.object({
    heading: builderField.text(200).optional(),
    description: builderField.text(1000).optional(),
    buttonText: builderField.text(100).optional(),
    buttonAction: builderField.action(['link', 'addToCart', 'addToWishlist', 'copyCode']).optional(),
    backgroundColor: builderField.hexColor().optional(),
    surface: builderField.surface().optional(),
  }),
  translatable: ['/heading', '/description', '/buttonText'],
  upgrade: { 1: upgradeTitleIntoHeading, 2: upgradeLinkIntoAction('buttonLink', 'buttonAction') },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading'], category: 'store' },
})
