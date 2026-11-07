import * as z from 'zod'

/** The newsletter sign-up form on a band: to the newsletter it names, or the store's default. */
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
    topic: builderField.id().optional(),
  }),
  translatable: ['/heading', '/description', '/placeholder', '/buttonText'],
  refs: { '/topic': 'topic' },
  upgrade: { 1: upgradeTitleIntoHeading },
  presets: [{ id: BUILDER_DEFAULT_PRESET }],
  editor: { title: ['heading'], category: 'store' },
})
