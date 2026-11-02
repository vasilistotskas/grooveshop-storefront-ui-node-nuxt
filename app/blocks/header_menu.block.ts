import * as z from 'zod'

/** The header menu: a flat list of links. */
export default defineBlock({
  type: 'header_menu',
  version: 1,
  kinds: ['section'],
  schema: z.object({}),
  groups: ['header'],
  children: { allowed: ['nav_link'], maxDepth: 1 },
  childList: { nav_link: 'links' },
  presets: [{ id: BUILDER_DEFAULT_PRESET, blocks: Array.from({ length: 3 }, () => ({ type: 'nav_link' })) }],
  editor: { category: 'navigation' },
})
