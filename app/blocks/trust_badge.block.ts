import * as z from 'zod'

/** The badge's own icon: its preset's, and the mark its upgrade gives a badge whose only one was an icon off the list. */
const TRUST_BADGE_ICON: BuilderIcon = 'i-lucide-shield-check'

/** One mark of a trust row: how you pay, who delivers, or that the store answers agents. */
export default defineBlock({
  type: 'trust_badge',
  version: 2,
  kinds: ['block'],
  schema: z.object({
    kind: z.enum(['payment', 'shipping', 'ai', 'custom']),
    label: builderField.requiredText(60),
    imageUrl: builderField.text(1000).optional(),
    image: builderField.ref('media', { onMissing: 'empty' }).optional(),
    icon: builderField.icon().optional(),
    href: builderField.link().optional(),
  })
    // A badge with neither a logo nor an icon would be a bare word in a row of marks.
    // The rule is stated in the catalogue too, so Django refuses it on save.
    .refine(badge => badge.image !== undefined || Boolean(badge.imageUrl || badge.icon), { message: 'needs image, imageUrl or icon' })
    .meta({ anyOf: [{ required: ['image'] }, { required: ['imageUrl'], properties: { imageUrl: { minLength: 1 } } }, { required: ['icon'] }] }),
  upgrade: { 1: upgradeIconSettingKeepingAMark(TRUST_BADGE_ICON) },
  legacyImages: [{ from: '/imageUrl', to: '/image' }],
  translatable: ['/label'],
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { kind: 'custom', icon: TRUST_BADGE_ICON } }],
  editor: { title: ['label'] },
})
