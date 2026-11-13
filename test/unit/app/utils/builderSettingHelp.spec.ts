import { describe, expect, it } from 'vitest'
import { builderSettingHelpKey } from '~/utils/builderSettingHelp'

/**
 * Which help line a block's settings form shows for a setting: the block's
 * own, else the one every block with the setting shares, else none. The
 * posts band's icon line is its own, so a footer column's icon field, the
 * same setting name, shows none (2026-11-13: it showed the posts band's).
 */
describe('builderSettingHelpKey', () => {
  it.each([
    ['blog_posts_grid', 'icon', 'blocks.blog_posts_grid.settings.icon.help'],
    ['footer_column', 'icon', undefined],
    ['store_assurances', 'layout', 'blocks.store_assurances.settings.layout.help'],
    ['blog_posts_grid', 'layout', 'blocks.blog_posts_grid.settings.layout.help'],
    ['product_categories', 'layout', undefined],
    ['blog_categories', 'look', 'blocks.blog_categories.settings.look.help'],
    ['hero_showcase', 'look', 'settings.look.help'],
    ['products_grid', 'phoneLimit', 'settings.phoneLimit.help'],
  ])('reads %s’s %s help from %s', (type, path, key) => {
    expect(builderSettingHelpKey(type, path)).toBe(key)
  })
})
