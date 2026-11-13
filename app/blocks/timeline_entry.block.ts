import * as z from 'zod'

/** One moment of a story: a title, when it was, what happened. */
export default defineBlock({
  type: 'timeline_entry',
  version: 2,
  kinds: ['block'],
  schema: z.object({
    title: builderField.requiredText(100),
    date: builderField.text(50).optional(),
    text: builderField.text(500).optional(),
    icon: builderField.icon().optional(),
  }),
  upgrade: { 1: upgradeIconSetting },
  translatable: ['/title', '/date', '/text'],
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['title'] },
})
