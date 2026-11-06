import * as z from 'zod'

/** Live promotions on a page that is not the offers page; draws nothing between campaigns. */
export default defineBlock({
  type: 'offers_preview',
  version: 3,
  kinds: ['section'],
  feature: 'promotions',
  schema: z.object({
    surface: builderField.inkSurface().optional(),
    eyebrow: builderField.text(100).optional(),
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    offers: builderField.query('promotion', { onEmpty: 'hide', maxLimit: 6 }),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
  }),
  translatable: ['/eyebrow', '/heading', '/subheading', '/ctaText'],
  upgrade: { 1: upgradeOffers(3), 2: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { offers: { limit: 3 } } }],
  editor: { title: ['heading'], category: 'products' },
})
