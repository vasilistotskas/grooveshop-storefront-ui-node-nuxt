import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMPONENTS, parseSfc, relativeLabel, sfcScript, withoutComments } from '../../helpers/sourceText'

/**
 * What a band forced light or dark holds paints with the theme's tokens.
 *
 * A band's colour scheme is Nuxt UI's `.light` / `.dark` subtree switch
 * (`colorSchemeClass`): every token inside the band takes the scheme, with the
 * store's own colours (`test/unit/shared/theme/schemes.spec.ts`). A named
 * Tailwind colour (`text-neutral-950`, `bg-white`) does not follow it, and a
 * `dark:` variant follows the nearest `.dark` ANCESTOR, the page's included:
 * in a light band on a dark page it still applies. So the shared sections that
 * take a colour scheme, and the cards they hold in every design, are written
 * with tokens alone.
 *
 * Webside's own product card (`variants/webside/Product/Card.vue`) is not in
 * this list: its look is pinned, and it paints with named colours and `dark:`
 * variants. In a dark band on a light page it reads as webside's dark card; in
 * a light band on a dark page it stays a dark card.
 */
const FILES = [
  'PageSection/Band.vue',
  'PageSection/HeroShowcase.vue',
  'PageSection/StoreAssurances.vue',
  'PageSection/BlogCategoryTiles.vue',
  'PageSection/ProductsGrid.vue',
  'PageSection/ProductsSlider.vue',
  'PageSection/BlogPosts.vue',
  'PageSection/BlogPostsCarousel.vue',
  'Product/Card.vue',
  'Product/Spotlight.vue',
  'Products/Rail.vue',
  'Blog/Rail.vue',
  'Blog/Post/Card.vue',
  'PageSection/HeroShowcaseBold.vue',
  'PageSection/BandBold.vue',
  'PageSection/BlogCategoryTilesBold.vue',
  'PageSection/BlogPostsFeature.vue',
  'PageSection/ProductsCategoryTile.vue',
  'Product/SpotlightBold.vue',
  'Blog/RailBold.vue',
].map(file => resolve(COMPONENTS, file))

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const UTILITY = 'text|bg|border|ring|outline|fill|stroke|from|to|via|divide|decoration|shadow|accent|caret'
const NAMED_COLOUR = new RegExp(`(?:^|[\\s'"\`:])(?:${UTILITY})-(?:white|black|(?:${PALETTE})-\\d{2,3})(?:/\\d+)?(?=$|[\\s'"\`])`, 'gm')
const SCHEME_VARIANT = /(?:^|[\s'"`])(?:dark|light):[\w-]/gm

function offences(file: string): string[] {
  const source = withoutComments(`${parseSfc(file).template?.content ?? ''}\n${sfcScript(file)}`)
  return [...source.matchAll(NAMED_COLOUR), ...source.matchAll(SCHEME_VARIANT)].map(([found]) => `${relativeLabel(COMPONENTS, file)}: ${found.trim()}`)
}

describe('a band forced light or dark', () => {
  it('holds only what paints with the theme\'s tokens', () => {
    expect(FILES.flatMap(offences)).toEqual([])
  })

  it('still reads the classes it guards', () => {
    // A rule that stopped matching would pass forever: webside's card is the known case it would catch.
    expect(offences(resolve(COMPONENTS, 'variants/webside/Product/Card.vue')).length).toBeGreaterThan(3)
  })
})
