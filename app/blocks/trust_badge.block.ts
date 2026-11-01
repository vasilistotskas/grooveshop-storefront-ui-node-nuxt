import * as z from 'zod'

/** One mark of a trust row: how you pay, who delivers, or that the store answers agents. */
export default defineBlock({
  type: 'trust_badge',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    kind: z.enum(['payment', 'shipping', 'ai', 'custom']),
    label: builderField.requiredText(60),
    imageUrl: builderField.text(1000).optional(),
    icon: builderField.icon().optional(),
    href: builderField.link().optional(),
  })
    // A badge with neither a logo nor an icon would be a bare word in a row of marks.
    // The rule is stated in the catalogue too, so Django refuses it on save.
    .refine(badge => Boolean(badge.imageUrl || badge.icon), { message: 'needs imageUrl or icon' })
    .meta({ anyOf: [{ required: ['imageUrl'] }, { required: ['icon'] }] }),
  translatable: ['/label'],
})
