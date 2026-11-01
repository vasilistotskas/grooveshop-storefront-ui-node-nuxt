import * as z from 'zod'
import { defineBlock } from '~~/shared/builder/defineBlock'

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
    href: z.string().regex(/^(\/|https:\/\/)/).optional(),
  }),
  translatable: ['/label'],
  limits: { maxBlocks: 4 },
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
  hydrate: 'idle',
  upgrade: {
    1: ({ settings: { heading, ...rest }, ...body }) => ({ ...body, settings: { ...rest, title: heading } }),
  },
})

export const fixtureBlocks = [promoBanner, promoItem]
