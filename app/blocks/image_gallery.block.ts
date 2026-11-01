import * as z from 'zod'

/** A gallery of pictures in two to four columns. */
export default defineBlock({
  type: 'image_gallery',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
    columns: builderField.integer(2, 4).optional(),
  }),
  translatable: ['/title'],
  limits: { maxBlocks: 24 },
  children: { allowed: ['gallery_image'], maxDepth: 1 },
  childList: { gallery_image: 'items' },
})
