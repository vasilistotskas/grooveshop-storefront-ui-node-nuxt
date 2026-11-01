import * as z from 'zod'

/** One picture of a gallery, with the text a screen reader and a caption need. */
export default defineBlock({
  type: 'gallery_image',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    src: builderField.requiredText(1000),
    alt: builderField.requiredText(200),
    caption: builderField.text(200).optional(),
  }),
  translatable: ['/alt', '/caption'],
})
