import * as z from 'zod'

/** A grid of what the store offers, with a closing card for the shopper who did not find theirs. */
export default defineBlock({
  type: 'features_grid',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    body: builderField.text(600).optional(),
    columns: builderField.integer(1, 4).optional(),
    decor: z.enum(['none', 'gradient_tiles', 'framed']).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    prompt: z.object({
      title: builderField.requiredText(100),
      text: builderField.text(300).optional(),
      ctaText: builderField.text(100).optional(),
      ctaLink: builderField.link().optional(),
    }).optional(),
  }),
  translatable: ['/heading', '/body', '/ctaText', '/prompt'],
  limits: { maxBlocks: 12 },
  children: { allowed: ['feature_item'], maxDepth: 1 },
  childList: { feature_item: 'items' },
})
