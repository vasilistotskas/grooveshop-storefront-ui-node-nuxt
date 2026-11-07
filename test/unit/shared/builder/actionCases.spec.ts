import { describe, expect, it } from 'vitest'
import { blockSettingsJsonSchema } from '~~/shared/builder/jsonSchema'
import type { BlockDefinition } from '~~/shared/types/builder'
import cases from '~~/test/fixtures/builder/action-cases.json'

/**
 * What an action may hold: `test/fixtures/builder/action-cases.json` is
 * vendored by Django, which validates every save against the JSON Schema of the
 * catalogue. The rule is written twice, as `.refine` and as `oneOf`, so the two
 * are held to one list: this side against the block as it is declared.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/hero_banner.block.ts', { eager: true })
const heroBanner = Object.values(modules)[0]!.default

describe('action-cases.json', () => {
  it.each(cases)('$name: valid is $valid', ({ settings, valid }) => {
    expect(heroBanner.schema.strict().safeParse(settings).success).toBe(valid)
  })

  it('states the rule in the catalogue, not only in the parse', () => {
    const schema = blockSettingsJsonSchema(heroBanner.schema) as { properties: { ctaAction: { oneOf: { properties: Record<string, unknown> & { kind: { const: string } }, required: string[] }[] } } }

    expect(schema.properties.ctaAction.oneOf.map(({ properties, required }) => [properties.kind.const, required])).toEqual([
      ['link', ['to']],
      ['addToCart', ['product']],
      ['addToWishlist', ['product']],
      ['copyCode', ['promotion']],
    ])
    // A target left behind by another kind is refused, or it would hold a reference nobody can see.
    expect(schema.properties.ctaAction.oneOf.map(({ properties: { kind, ...others } }) => [kind.const, others])).toEqual([
      ['link', { product: false, promotion: false }],
      ['addToCart', { to: false, promotion: false }],
      ['addToWishlist', { to: false, promotion: false }],
      ['copyCode', { to: false, product: false }],
    ])
  })

  it('lets Django see what each target names', () => {
    expect(heroBanner.linkRefs).toContain('/ctaAction/to')
    expect(Object.keys(heroBanner.data)).toEqual(expect.arrayContaining(['/ctaAction/product', '/ctaAction/promotion']))
    expect(heroBanner.actions).toEqual(['/ctaAction'])
  })
})
