import * as z from 'zod'

/** One editorial slide of the hero carousel: artwork, its copy and its destination. */
export default defineBlock({
  type: 'hero_slide',
  version: 2,
  kinds: ['block'],
  schema: z.object({
    imageUrl: builderField.text(1000).optional(),
    mobileImageUrl: builderField.text(1000).optional(),
    alt: builderField.text(200).optional(),
    image: builderField.ref('media', { onMissing: 'empty' }).optional(),
    mobileImage: builderField.ref('media', { onMissing: 'empty' }).optional(),
    // An explicit choice: an empty description never means decorative.
    imageDecorative: builderField.boolean().optional(),
    eyebrow: builderField.text(100).optional(),
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    secondaryCtaText: builderField.text(100).optional(),
    secondaryCtaLink: builderField.link().optional(),
    // The product its chip shows; a slide whose product is gone is drawn without a chip.
    product: builderField.ref('product', { onMissing: 'empty' }).optional(),
  })
    // A slide with no artwork would be a bare caption. The rule is stated in the catalogue too, so Django refuses it on save.
    .refine(slide => slide.image !== undefined || Boolean(slide.imageUrl), { message: 'needs image or imageUrl' })
    .meta({ anyOf: [{ required: ['image'] }, { required: ['imageUrl'], properties: { imageUrl: { minLength: 1 } } }] }),
  translatable: ['/alt', '/eyebrow', '/heading', '/subheading', '/ctaText', '/secondaryCtaText'],
  upgrade: { 1: upgradeHeroSlide },
  legacyImages: [
    { from: '/imageUrl', to: '/image', alt: '/alt' },
    { from: '/mobileImageUrl', to: '/mobileImage' },
  ],
  editor: { title: ['heading'] },
})
