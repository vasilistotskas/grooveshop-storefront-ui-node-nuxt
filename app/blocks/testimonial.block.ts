import * as z from 'zod'

/** One quote: who said it, what, and a five-point rating shown as stars. */
export default defineBlock({
  type: 'testimonial',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    name: builderField.text(100).optional(),
    text: builderField.text(1000).optional(),
    avatar: builderField.text(1000).optional(),
    avatarImage: builderField.ref('media', { onMissing: 'empty' }).optional(),
    role: builderField.text(100).optional(),
    rating: builderField.integer(1, 5).optional(),
  }),
  translatable: ['/name', '/text', '/role'],
  legacyImages: [{ from: '/avatar', to: '/avatarImage' }],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['name'] },
})
