import * as z from 'zod'

/** The top of a page: one picture, one promise, one ask, with an optional proof row. */
export default defineBlock({
  type: 'hero_banner',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    eyebrow: builderField.text(100).optional(),
    imageUrl: builderField.text(1000).optional(),
    mobileImageUrl: builderField.text(1000).optional(),
    imageAlt: builderField.text(200).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    secondaryCtaText: builderField.text(100).optional(),
    secondaryCtaLink: builderField.link().optional(),
    overlayOpacity: builderField.number(0, 1).optional(),
    decor: z.enum(['none', 'orbs', 'gradient']).optional(),
    align: z.enum(['left', 'center']).optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
  }),
  translatable: ['/title', '/heading', '/subheading', '/eyebrow', '/imageAlt', '/ctaText', '/secondaryCtaText'],
  limits: { maxBlocks: 4 },
  children: { allowed: ['stat'], maxDepth: 1 },
  childList: { stat: 'stats' },
})
