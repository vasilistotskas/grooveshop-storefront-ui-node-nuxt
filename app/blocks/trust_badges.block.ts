import * as z from 'zod'

/** How you pay, who delivers and, for a store that answers agents, that it is agent-readable. */
export default defineBlock({
  type: 'trust_badges',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    marquee: builderField.boolean().optional(),
  }),
  translatable: ['/title', '/heading'],
  limits: { maxBlocks: 12 },
  children: { allowed: ['trust_badge'], maxDepth: 1 },
  childList: { trust_badge: 'items' },
})
