import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'

/**
 * Two blocks the builder's specs run on: a section at version 2 (it was
 * renamed from `heading` to `title`), and the block it holds.
 * Production defines none yet.
 */
export const promoItem = defineBlock({
  type: 'promo_item',
  version: 1,
  kinds: ['block'],
  schema: z.object({
    label: z.string().max(40),
    href: builderField.link().optional(),
  }),
  translatable: ['/label'],
  limits: { maxBlocks: 4 },
  editor: { title: ['label'] },
})

export const promoBanner = defineBlock({
  type: 'promo_banner',
  version: 2,
  kinds: ['section'],
  schema: z.object({
    title: z.string().max(80),
    tone: z.enum(['info', 'accent']).default('info'),
    productId: z.number().int().optional(),
    note: z.object({ text: z.string().optional() }).optional(),
  }),
  translatable: ['/title', '/note/text'],
  refs: { '/productId': 'product' },
  limits: { maxPerTemplate: 3 },
  children: { allowed: ['promo_item'], maxDepth: 1 },
  groups: ['marketing'],
  templates: ['home'],
  childList: { promo_item: 'items' },
  upgrade: {
    1: ({ settings: { heading, ...rest }, ...body }) => ({ ...body, settings: { ...rest, title: heading } }),
  },
})

/**
 * A band that lists products by a rule, with a spotlight on one, to run the data
 * settings on: `products` is declared `hide` (a band with nothing to list is
 * left out), `spotlight` `empty` (its component draws the absence).
 */
export const promoRail = defineBlock({
  type: 'promo_rail',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    heading: z.string().max(80).optional(),
    products: builderField.query('product', { onEmpty: 'hide', maxLimit: 12 }),
    spotlight: builderField.ref('product', { onMissing: 'empty' }).optional(),
  }),
  translatable: ['/heading'],
})

/** A picture that still stores its image as a URL beside the media reference that replaces it, to run the read adapter on. */
export const promoPicture = defineBlock({
  type: 'promo_picture',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    imageUrl: z.string().max(1000).optional(),
    imageAlt: z.string().max(200).optional(),
    image: builderField.ref('media', { onMissing: 'empty' }).optional(),
  }),
  legacyImages: [{ from: '/imageUrl', to: '/image', alt: '/imageAlt' }],
})

export const fixtureBlocks = [promoBanner, promoItem, promoRail, promoPicture]
