import * as z from 'zod'

/** What customers say, on a band. */
export default defineBlock({
  type: 'testimonials',
  version: 3,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
  }),
  translatable: ['/heading'],
  upgrade: { 1: upgradeTitleIntoHeading, 2: upgradeLeavingOutDefaults({ '/surface': 'default' }) },
  limits: { maxBlocks: 20 },
  children: { allowed: ['testimonial'], maxDepth: 1 },
  childList: { testimonial: 'items' },
  presets: [{ id: BUILDER_DEFAULT_PRESET, blocks: Array.from({ length: 3 }, () => ({ type: 'testimonial' })) }],
  editor: { title: ['heading'], category: 'trust' },
})
