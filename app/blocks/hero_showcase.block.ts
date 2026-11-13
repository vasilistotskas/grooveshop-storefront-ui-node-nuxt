import * as z from 'zod'

/**
 * The top of a page that sells and searches at once: a heading (its second
 * line in the accent), a sub-line, the store search, two buttons, a picture
 * with its own phone version and link, and one product to buy on the spot.
 */
export default defineBlock({
  type: 'hero_showcase',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    eyebrow: builderField.text(100).optional(),
    heading: builderField.text(200).optional(),
    headingAccent: builderField.text(200).optional(),
    subheading: builderField.text(500).optional(),
    image: builderField.ref('media', { onMissing: 'empty' }).optional(),
    mobileImage: builderField.ref('media', { onMissing: 'empty' }).optional(),
    // An explicit choice: an empty description never means decorative.
    imageDecorative: builderField.boolean().optional(),
    imageLink: builderField.link().optional(),
    showSearch: builderField.boolean().optional(),
    /** The search field's own question, in place of the store search's wording. */
    searchPlaceholder: builderField.text(100).optional(),
    ctaText: builderField.text(100).optional(),
    ctaLink: builderField.link().optional(),
    secondaryCtaText: builderField.text(100).optional(),
    secondaryCtaLink: builderField.link().optional(),
    product: builderField.ref('product', { onMissing: 'empty' }).optional(),
    showAddToCart: builderField.boolean().optional(),
    colorScheme: builderField.colorScheme().optional(),
    /** `bold`: the heavier look of the home board (bigger, bolder headings, an accent eyebrow, text links). Left out, the look it always had. */
    look: z.enum(['bold']).optional(),
  }),
  translatable: ['/eyebrow', '/heading', '/headingAccent', '/subheading', '/searchPlaceholder', '/ctaText', '/secondaryCtaText'],
  // A section's preset holds no starter text (the house pattern: only child
  // blocks do, `presets` in the labels). The search field is what makes a
  // new hero draw something on the canvas before the merchant writes a word.
  presets: [{ id: BUILDER_DEFAULT_PRESET, settings: { showSearch: true } }],
  editor: { title: ['heading'], category: 'hero' },
})
