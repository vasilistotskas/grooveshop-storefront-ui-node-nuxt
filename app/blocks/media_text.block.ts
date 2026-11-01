import * as z from 'zod'

/** A picture beside a text, with bullets and spec cards under it. `emphasis` is a substring of `body` set in the emphasis weight, not markup: an HTML setting would be an injection surface for one bold phrase. */
export default defineBlock({
  type: 'media_text',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    body: builderField.text(5000).optional(),
    eyebrow: builderField.text(100).optional(),
    note: builderField.text(200).optional(),
    emphasis: builderField.text(120).optional(),
    imageUrl: builderField.text(1000).optional(),
    imagePosition: z.enum(['left', 'right']).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    decor: z.enum(['none', 'orbs', 'gradient']).optional(),
  }),
  translatable: ['/title', '/heading', '/body', '/eyebrow', '/note', '/emphasis', '/ctaText'],
  limits: { maxBlocks: 10 },
  children: { allowed: ['bullet', 'spec_card'], maxDepth: 2 },
  childList: { bullet: 'bullets', spec_card: 'specs' },
})
