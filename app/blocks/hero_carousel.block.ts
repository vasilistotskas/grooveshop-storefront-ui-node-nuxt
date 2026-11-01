import * as z from 'zod'

/**
 * The page's lead carousel. With slides, each owns its copy and destination;
 * without, the flat image lists are drawn (a phone's own crops at the same
 * positions in `mobileImages`). 0 is no autoplay, and the component pauses
 * under reduced motion either way.
 */
export default defineBlock({
  type: 'hero_carousel',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    autoplayMs: z.union([z.literal(0), builderField.integer(3000, 15000)]).optional(),
    aspect: z.enum(['wide', 'banner', 'square']).optional(),
    images: z.array(builderField.text(1000)).max(10).optional(),
    mobileImages: z.array(builderField.text(1000)).max(10).optional(),
    link: builderField.link().optional(),
  }),
  limits: { maxBlocks: 8 },
  children: { allowed: ['hero_slide'], maxDepth: 1 },
  childList: { hero_slide: 'slides' },
})
