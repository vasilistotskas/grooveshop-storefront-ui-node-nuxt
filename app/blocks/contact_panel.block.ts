import * as z from 'zod'

/**
 * The contact page as one band: its copy and a hint. The offices come from the
 * store's own settings and the form's labels are interface text, so neither is a setting.
 */
export default defineBlock({
  type: 'contact_panel',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    eyebrow: builderField.text(100).optional(),
    heading: builderField.text(200).optional(),
    body: builderField.text(600).optional(),
    hint: builderField.text(400).optional(),
  }),
  translatable: ['/title', '/eyebrow', '/heading', '/body', '/hint'],
})
