import * as z from 'zod'

/** Questions and answers, as an accordion. */
export default defineBlock({
  type: 'faq',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    surface: builderField.surface().optional(),
    heading: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    multiple: builderField.boolean().optional(),
  }),
  translatable: ['/heading', '/subheading'],
  limits: { maxBlocks: 30 },
  children: { allowed: ['faq_item'], maxDepth: 1 },
  childList: { faq_item: 'items' },
  presets: [{ id: BUILDER_DEFAULT_PRESET, blocks: Array.from({ length: 3 }, () => ({ type: 'faq_item' })) }],
  editor: { title: ['heading'], category: 'content' },
})
