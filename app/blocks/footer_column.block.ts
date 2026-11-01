import * as z from 'zod'

/** A heading of the footer with its own links. One column of the footer may show the store's legal details under its links. */
export default defineBlock({
  type: 'footer_column',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    label: builderField.requiredText(100),
    icon: builderField.icon(64).optional(),
    showsMerchantIdentity: builderField.boolean().optional(),
  }),
  translatable: ['/label'],
  children: { allowed: ['nav_link'], maxDepth: 1 },
  childList: { nav_link: 'children' },
})
