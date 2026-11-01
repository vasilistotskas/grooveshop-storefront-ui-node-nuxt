import * as z from 'zod'

/** The newsletter sign-up form on a band. */
export default defineBlock({
  type: 'newsletter_signup',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    title: builderField.text(200).optional(),
    heading: builderField.text(200).optional(),
    description: builderField.text(1000).optional(),
    placeholder: builderField.text(100).optional(),
    buttonText: builderField.text(60).optional(),
    surface: builderField.surface().optional(),
  }),
  translatable: ['/title', '/heading', '/description', '/placeholder', '/buttonText'],
})
