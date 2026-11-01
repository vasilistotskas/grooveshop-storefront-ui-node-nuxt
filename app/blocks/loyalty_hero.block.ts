import * as z from 'zod'

/** The loyalty programme's guest card: its wording only, the numbers come from the programme's settings. */
export default defineBlock({
  type: 'loyalty_hero',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
    eyebrow: builderField.text(100).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    secondaryCtaText: builderField.text(100).optional(),
    secondaryCtaLink: builderField.link().optional(),
  }),
  translatable: ['/title', '/eyebrow', '/ctaText', '/secondaryCtaText'],
})
