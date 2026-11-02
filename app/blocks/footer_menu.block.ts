import * as z from 'zod'

/** The footer menu: columns, each with its links. */
export default defineBlock({
  type: 'footer_menu',
  version: 1,
  kinds: ['section'],
  schema: z.object({}),
  groups: ['footer'],
  children: { allowed: ['footer_column'] },
  childList: { footer_column: 'columns' },
  presets: [{ id: BUILDER_DEFAULT_PRESET, blocks: Array.from({ length: 2 }, () => ({ type: 'footer_column' })) }],
  editor: { category: 'navigation' },
})
