import * as z from 'zod'

/** A picture beside a text, with bullets and spec cards under it. `emphasis` is a substring of `body` set in the emphasis weight, not markup: an HTML setting would be an injection surface for one bold phrase. */
export default defineBlock({
  type: 'media_text',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    body: builderField.text(5000).optional(),
    eyebrow: builderField.text(100).optional(),
    note: builderField.text(200).optional(),
    emphasis: builderField.text(120).optional(),
    imageUrl: builderField.text(1000).optional(),
    image: builderField.ref('media', { onMissing: 'empty' }).optional(),
    // An explicit choice: an empty description never means decorative.
    imageDecorative: builderField.boolean().optional(),
    imagePosition: z.enum(['left', 'right']).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    decor: z.enum(['none', 'orbs', 'gradient']).optional(),
  }),
  translatable: ['/heading', '/body', '/eyebrow', '/note', '/emphasis', '/ctaText'],
  upgrade: { 1: upgradeTitleIntoHeading },
  legacyImages: [{ from: '/imageUrl', to: '/image' }],
  limits: { maxBlocks: 10 },
  children: { allowed: ['bullet', 'spec_card'], maxDepth: 2 },
  childList: { bullet: 'bullets', spec_card: 'specs' },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading'], category: 'content' },
})
