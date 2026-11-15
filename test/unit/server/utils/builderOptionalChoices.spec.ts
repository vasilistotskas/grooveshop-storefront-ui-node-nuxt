import { describe, expect, it } from 'vitest'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * An optional choice never holds its own default.
 *
 * The editor draws every optional choice with a first entry of its own,
 * "Default", which stores no key and leaves the look to the section's
 * component. A choice that also held the value its component draws when the
 * key is left out offered two entries for one look, and a merchant could not
 * tell them apart (storefront issue 469). So each block's choices name only
 * looks the default is not, and a value left out of a choice is taken out of
 * the stored documents by an upgrade of the block (`upgradeLeavingOutDefaults`).
 *
 * What a component draws with the key left out cannot be read off the
 * catalogue, so `LEFT_OUT` states it, per block and setting pointer, for
 * every optional choice the catalogue serves Django: the value that draws
 * it, or `null` where no value names that look (a colour scheme left out
 * follows the page; an icon left out draws none). A choice added to a block
 * fails here until it says what its Default draws.
 *
 * Reads the REAL blocks of `app/blocks`. Vitest caches this file's
 * transform, globs included: after ADDING a block file locally, edit this
 * comment once or it is not seen (CI starts clean).
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)

const LEFT_OUT: Record<string, Record<string, string | null>> = {
  blog_categories: { '/layout': 'slider', '/look': null },
  blog_posts_carousel: { '/surface': 'default', '/colorScheme': null },
  blog_posts_grid: { '/surface': 'default', '/colorScheme': null, '/phoneLayout': 'row', '/layout': null, '/icon': null, '/look': null },
  blog_posts_list: { '/surface': 'default', '/colorScheme': null },
  business_hours: { '/surface': 'default' },
  cta_banner: { '/surface': 'default' },
  divider: { '/variant': 'line' },
  faq: { '/surface': 'default' },
  feature_item: { '/icon': null },
  featured_products: { '/surface': 'default', '/colorScheme': null, '/products/stock': 'any' },
  features_grid: { '/surface': 'default', '/decor': 'none' },
  footer_column: { '/icon': null },
  hero_banner: { '/decor': 'none', '/align': 'center', '/theme': 'auto' },
  hero_carousel: { '/aspect': 'wide' },
  hero_showcase: { '/colorScheme': null, '/look': null },
  image_gallery: { '/surface': 'default' },
  location_map: { '/surface': 'default' },
  // No ground of its own, where `default` adds the raised band's hairlines.
  loyalty_hero: { '/surface': null },
  media_text: { '/surface': 'default', '/imagePosition': 'left', '/decor': 'none' },
  nav_link: { '/icon': null, '/route': null },
  newsletter_signup: { '/surface': 'muted', '/headingColor': 'default', '/look': null },
  offers_preview: { '/surface': 'ink' },
  product_categories: { '/surface': 'default', '/layout': 'tiles' },
  products_grid: { '/surface': 'default', '/colorScheme': null, '/products/stock': 'any', '/look': null },
  products_slider: { '/surface': 'default', '/colorScheme': null, '/products/stock': 'any' },
  spacer: { '/height': 'md' },
  stats_strip: { '/surface': 'muted' },
  store_assurances: { '/surface': 'default', '/layout': null },
  story_timeline: { '/surface': 'default' },
  testimonials: { '/surface': 'default' },
  timeline_entry: { '/icon': null },
  trust_badge: { '/icon': null },
  trust_badges: { '/surface': 'default' },
}

type JsonSchema = {
  enum?: unknown[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
}

/** `{pointer: enum}` of every choice under `schema` a document may leave out; a list's entries are `*`. */
function optionalChoices(schema: JsonSchema, pointer = '', required = true): Record<string, unknown[]> {
  const own = schema.enum && !required ? { [pointer]: schema.enum } : {}
  const named = new Set(schema.required ?? [])
  const nested = [
    ...Object.entries(schema.properties ?? {}).map(([key, value]) => optionalChoices(value, `${pointer}/${key}`, named.has(key))),
    ...(schema.items ? [optionalChoices(schema.items, `${pointer}/*`)] : []),
    ...[...schema.anyOf ?? [], ...schema.oneOf ?? [], ...schema.allOf ?? []].map(branch => optionalChoices(branch, pointer, required)),
  ]
  return Object.assign(own, ...nested)
}

const choices = Object.fromEntries(buildBlockCatalogue(definitions).blocks
  .map(block => [block.type, optionalChoices(block.schema as JsonSchema)] as const)
  .filter(([, found]) => Object.keys(found).length > 0))

describe('the optional choices of the real blocks', () => {
  it('say what each block draws when one is left out, for every one the catalogue serves and no other', () => {
    const stated = Object.fromEntries(Object.entries(LEFT_OUT).map(([type, pointers]) => [type, Object.keys(pointers).sort()]))
    const served = Object.fromEntries(Object.entries(choices).map(([type, pointers]) => [type, Object.keys(pointers).sort()]))

    expect(stated).toEqual(served)
  })

  it('never offer the value that draws what Default draws', () => {
    const offered = Object.entries(LEFT_OUT).flatMap(([type, pointers]) => Object.entries(pointers)
      .filter(([pointer, value]) => value !== null && choices[type]?.[pointer]?.includes(value))
      .map(([pointer, value]) => `${type} ${pointer}: ${value}`))

    expect(offered).toEqual([])
  })
})
