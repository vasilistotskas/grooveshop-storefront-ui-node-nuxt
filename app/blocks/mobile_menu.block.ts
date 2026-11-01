import * as z from 'zod'

/** The mobile menu: a flat list of links. A store without one shows its header menu on a phone. */
export default defineBlock({
  type: 'mobile_menu',
  version: 1,
  kinds: ['section'],
  schema: z.object({}),
  groups: ['mobile'],
  children: { allowed: ['nav_link'], maxDepth: 1 },
  childList: { nav_link: 'links' },
})
