import * as z from 'zod'

/** What customers say, on a band. */
export default defineBlock({
  type: 'testimonials',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
  }),
  translatable: ['/title', '/heading'],
  limits: { maxBlocks: 20 },
  children: { allowed: ['testimonial'], maxDepth: 1 },
  childList: { testimonial: 'items' },
})
