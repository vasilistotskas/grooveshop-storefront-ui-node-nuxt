import * as z from 'zod'
import { describe, expect, it } from 'vitest'
import { readyActions, withoutDisabledActions } from '~~/shared/builder/actions'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'
import type { BuilderActionFeature, BuilderDocument } from '~~/shared/types/builder'

const block = defineBlock({
  type: 'button_band',
  version: 1,
  kinds: ['section', 'block'],
  schema: z.object({
    text: builderField.text(100).optional(),
    ctaAction: builderField.action(['link', 'addToCart', 'addToWishlist', 'copyCode']).optional(),
  }),
  children: { allowed: ['button_band'], maxDepth: 1 },
})
const registry = new Map([['button_band', block]])

const ok = <T>(value: T) => ({ status: 'ok', value })
const LINK = { kind: 'link', to: { route: '/' } }
const CART = { kind: 'addToCart', product: 5 }
const WISHLIST = { kind: 'addToWishlist', product: 5 }
const COPY = { kind: 'copyCode', promotion: 3 }

const documentWith = (ctaAction: unknown, child?: unknown): BuilderDocument => ({
  settings: {},
  order: ['a'],
  sections: {
    a: {
      type: 'button_band@1',
      settings: { text: 'Δες', ctaAction },
      ...(child ? { blocks: { b: { type: 'button_band@1', settings: { ctaAction: child } } }, blockOrder: ['b'] } : {}),
    },
  },
} as BuilderDocument)

const on = (...features: BuilderActionFeature[]) => (name: BuilderActionFeature) => features.includes(name)

describe('withoutDisabledActions', () => {
  it.each([
    { name: 'a link needs no feature', action: LINK, features: [], kept: true },
    { name: 'the cart button needs the cart', action: CART, features: ['catalogue'], kept: false },
    { name: 'the cart button needs the catalogue', action: CART, features: ['cart'], kept: false },
    { name: 'the cart button with both', action: CART, features: ['cart', 'catalogue'], kept: true },
    { name: 'the wishlist button needs favourites', action: WISHLIST, features: ['catalogue'], kept: false },
    { name: 'the wishlist button needs the catalogue', action: WISHLIST, features: ['favourites'], kept: false },
    { name: 'the wishlist button with both', action: WISHLIST, features: ['favourites', 'catalogue'], kept: true },
    { name: 'the code button needs promotions', action: COPY, features: [], kept: false },
    { name: 'the code button with promotions', action: COPY, features: ['promotions'], kept: true },
  ] as { name: string, action: unknown, features: BuilderActionFeature[], kept: boolean }[])('$name', ({ action, features, kept }) => {
    const { sections } = withoutDisabledActions(documentWith(action), registry, on(...features))

    expect(sections.a!.settings).toEqual({ text: 'Δες', ...(kept ? { ctaAction: action } : {}) })
  })

  it('reaches a child, and what it takes out is no longer read', () => {
    const { sections } = withoutDisabledActions(documentWith(LINK, COPY), registry, on())

    expect(sections.a!.settings.ctaAction).toEqual(LINK)
    expect(sections.a!.blocks!.b!.settings).toEqual({})
  })

  it('leaves a block with no action alone', () => {
    const document = { settings: {}, order: ['a'], sections: { a: { type: 'unknown_block@1', settings: { ctaAction: CART } } } } as unknown as BuilderDocument

    expect(withoutDisabledActions(document, registry, on()).sections.a!.settings).toEqual({ ctaAction: CART })
  })
})

describe('readyActions', () => {
  it.each([
    { name: 'a link with its address', action: { kind: 'link', to: '/products' }, ready: true },
    { name: 'a link whose page is gone', action: { kind: 'link' }, ready: false },
    { name: 'a link not yet resolved', action: LINK, ready: false },
    { name: 'a product that was read', action: { kind: 'addToCart', product: ok({ id: 5 }) }, ready: true },
    { name: 'a product gone', action: { kind: 'addToCart', product: { status: 'missing' } }, ready: false },
    { name: 'a product whose read failed', action: { kind: 'addToCart', product: { status: 'failed' } }, ready: false },
    { name: 'a saved product that was read', action: { kind: 'addToWishlist', product: ok({ id: 5 }) }, ready: true },
    { name: 'a saved product gone', action: { kind: 'addToWishlist', product: { status: 'missing' } }, ready: false },
    { name: 'an offer with a code', action: { kind: 'copyCode', promotion: ok({ id: 3, code: 'SUMMER' }) }, ready: true },
    { name: 'an offer that ended', action: { kind: 'copyCode', promotion: { status: 'missing' } }, ready: false },
    { name: 'an automatic offer, which has no code', action: { kind: 'copyCode', promotion: ok({ id: 3, code: null }) }, ready: false },
    { name: 'an offer with an empty code', action: { kind: 'copyCode', promotion: ok({ id: 3, code: '' }) }, ready: false },
    { name: 'a kind nothing runs', action: { kind: 'runScript', to: '/' }, ready: false },
  ])('$name: ready is $ready', ({ action, ready }) => {
    expect(readyActions({ text: 'Δες', ctaAction: action }, block)).toEqual({ text: 'Δες', ...(ready ? { ctaAction: action } : {}) })
  })

  it('hands back the same settings for a block with no action', () => {
    const settings = { ctaAction: LINK }

    expect(readyActions(settings, { actions: [] })).toBe(settings)
  })
})
