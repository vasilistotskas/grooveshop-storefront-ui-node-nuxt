import * as z from 'zod'

/** One cell of a features grid: a title, a line and an icon. */
export default defineBlock({
  type: 'feature_item',
  version: 2,
  kinds: ['block'],
  schema: z.object({
    title: builderField.requiredText(100),
    text: builderField.text(500).optional(),
    icon: builderField.icon().optional(),
  }),
  upgrade: { 1: upgradeIconSetting },
  translatable: ['/title', '/text'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'] },
})
