import * as z from 'zod'

/** One picture of a gallery, with the text a screen reader and a caption need. */
export default defineBlock({
  type: 'gallery_image',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    src: builderField.text(1000).optional(),
    alt: builderField.text(200).optional(),
    image: builderField.ref('media', { onMissing: 'empty' }).optional(),
    // An explicit choice: an empty description never means decorative.
    imageDecorative: builderField.boolean().optional(),
    caption: builderField.text(200).optional(),
  })
    // A picture needs a picture. The rule is stated in the catalogue too, so Django refuses it on save.
    .refine(picture => picture.image !== undefined || Boolean(picture.src), { message: 'needs image or src' })
    .meta({ anyOf: [{ required: ['image'] }, { required: ['src'] }] }),
  translatable: ['/alt', '/caption'],
  legacyImages: [{ from: '/src', to: '/image', alt: '/alt', decorative: '/imageDecorative' }],
  editor: { title: ['caption'] },
})
