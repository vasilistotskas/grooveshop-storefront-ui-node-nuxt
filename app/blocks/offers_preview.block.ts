import * as z from 'zod'

/** Live promotions on a page that is not the offers page; draws nothing between campaigns. */
export default defineBlock({
  type: 'offers_preview',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.inkSurface().optional(),
    eyebrow: builderField.text(100).optional(),
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    limit: builderField.integer(1, 6).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
  }),
  translatable: ['/title', '/eyebrow', '/heading', '/subheading', '/ctaText'],
})
