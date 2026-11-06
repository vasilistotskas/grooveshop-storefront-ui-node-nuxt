import * as z from 'zod'

/** How you pay, who delivers and, for a store that answers agents, that it is agent-readable. */
export default defineBlock({
  type: 'trust_badges',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    marquee: builderField.boolean().optional(),
  }),
  translatable: ['/heading'],
  upgrade: { 1: upgradeTitleIntoHeading },
  limits: { maxBlocks: 12 },
  children: { allowed: ['trust_badge'], maxDepth: 1 },
  childList: { trust_badge: 'items' },
  presets: [{ id: BUILDER_DEFAULT_PRESET, blocks: Array.from({ length: 3 }, () => ({ type: 'trust_badge' })) }],
  editor: { title: ['heading'], category: 'trust' },
})
