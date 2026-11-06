import * as z from 'zod'

/** The products this visitor looked at last; draws nothing until they have looked at one. */
export default defineBlock({
  type: 'recently_viewed',
  version: 2,
  kinds: ['section'],
  feature: 'catalogue',
  schema: z.object({
    heading: builderField.text(200).optional(),
  }),
  translatable: ['/heading'],
  upgrade: { 1: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading'], category: 'products' },
})
