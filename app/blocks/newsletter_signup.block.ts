import * as z from 'zod'

/** The newsletter sign-up form on a band. */
export default defineBlock({
  type: 'newsletter_signup',
  version: 2,
  kinds: ['section'],
  feature: 'newsletter',
  schema: z.object({
    heading: builderField.text(200).optional(),
    description: builderField.text(1000).optional(),
    placeholder: builderField.text(100).optional(),
    buttonText: builderField.text(60).optional(),
    surface: builderField.surface().optional(),
    /** The heading in the theme's accent, as the hero's accent line; left out, in the heading colour. */
    headingColor: z.enum(['accent']).optional(),
    /** `bold`: the heavier look of the home board (bigger, bolder headings, an accent eyebrow, text links). Left out, the look it always had. */
    look: z.enum(['bold']).optional(),
  }),
  translatable: ['/heading', '/description', '/placeholder', '/buttonText'],
  upgrade: { 1: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading'], category: 'store' },
})
