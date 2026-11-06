import { describe, expect, it } from 'vitest'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * TRANSITIONAL (P15 stage 2; deleted with `legacyImages` at stage 4).
 *
 * `test/fixtures/builder/legacy-image-fields.json` names, for every block that
 * still accepts an old image URL, where it is and what replaces it. Django
 * vendors it, pinned, and its `migrate_builder_media` reads it: block type,
 * the old pointer (`from`), the media reference setting that takes its place
 * (`to`), the old alt text (`alt`) and the boolean for a deliberately
 * undescribed picture (`decorative`) when the block has them, and whether the
 * pointer is a list (`list`: then `from` and `to` end in `/*`, one entry each).
 *
 * Generated from the blocks' own `legacyImages`, so it cannot drift: a change
 * fails here until regenerated with
 * `pnpm vitest run --project=unit test/unit/server/utils/legacyImageFields.spec.ts -u`
 * and reviewed in the diff.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)

const fields = definitions
  .flatMap(({ type, legacyImages = [] }) => legacyImages.map(({ from, to, alt, decorative }) => ({
    block: type,
    from,
    to,
    ...(alt && { alt }),
    ...(decorative && { decorative }),
    list: from.endsWith('/*'),
  })))
  .sort((a, b) => a.block.localeCompare(b.block) || a.from.localeCompare(b.from))

describe('the legacy image fields fixture', () => {
  it('is what the blocks declare', async () => {
    await expect(`${JSON.stringify(fields, null, 2)}\n`).toMatchFileSnapshot('../../../fixtures/builder/legacy-image-fields.json')
  })

  it('covers the seven image blocks', () => {
    expect([...new Set(fields.map(field => field.block))]).toEqual([
      'gallery_image',
      'hero_banner',
      'hero_carousel',
      'hero_slide',
      'media_text',
      'testimonial',
      'trust_badge',
    ])
  })
})
