import * as z from 'zod'

/** One editorial slide of the hero carousel: artwork, its copy and its destination. */
export default defineBlock({
  type: 'hero_slide',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    imageUrl: builderField.requiredText(1000),
    mobileImageUrl: builderField.text(1000).optional(),
    alt: builderField.text(200).optional(),
    eyebrow: builderField.text(100).optional(),
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    secondaryCtaText: builderField.text(100).optional(),
    secondaryCtaLink: builderField.link().optional(),
    productId: builderField.id().optional(),
  }),
  translatable: ['/alt', '/eyebrow', '/heading', '/subheading', '/ctaText', '/secondaryCtaText'],
  refs: { '/productId': 'product' },
})
