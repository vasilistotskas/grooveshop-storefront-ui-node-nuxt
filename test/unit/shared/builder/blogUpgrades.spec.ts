import { describe, expect, it } from 'vitest'
import { upgradeNode } from '~~/shared/builder/upgrade'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * Version 1 of the blog's bands kept what they list in `categoryId` and a
 * size spelled `count` or `pageSize`; version 2 keeps one descriptor. The
 * pages already written must draw what they drew.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('/app/blocks/**/*.block.ts', { eager: true })
const block = (type: string) => Object.values(modules).map(module => module.default).find(definition => definition.type === type)!

const upgraded = (type: string, settings: Record<string, unknown>) => {
  const definition = block(type)
  const node = upgradeNode({ type: `${type}@1`, settings }, definition)
  return { node, parsed: definition.schema.safeParse(node.settings) }
}

describe.each([
  ['blog_posts_grid', 'count', 3],
  ['blog_posts_list', 'pageSize', 3],
  ['blog_posts_carousel', 'count', 6],
] as const)('%s, version 1 to 2', (type, sizeKey, defaultSize) => {
  it('turns the category and the size into the descriptor of what it lists, newest first', () => {
    const { node, parsed } = upgraded(type, { categoryId: 5, [sizeKey]: 4, heading: 'Νέα', surface: 'muted' })

    expect(node.type).toBe(`${type}@2`)
    expect(node.settings).toEqual({
      heading: 'Νέα',
      surface: 'muted',
      posts: { mode: 'filter', category: 5, ordering: 'newest', limit: 4 },
    })
    expect(parsed.success).toBe(true)
  })

  it('leaves out what version 1 left out, with the size the component drew', () => {
    const { node, parsed } = upgraded(type, {})

    expect(node.settings).toEqual({ posts: { mode: 'filter', ordering: 'newest', limit: defaultSize } })
    expect(parsed.success).toBe(true)
  })

  it('keeps the words of the band, which a store may translate', () => {
    const { node } = upgraded(type, { heading: 'Επικεφαλίδα', subheading: 'Υπότιτλος', ctaText: 'Όλα', ctaLink: { route: '/blog' } })

    expect(node.settings).toMatchObject({ heading: 'Επικεφαλίδα', subheading: 'Υπότιτλος', ctaText: 'Όλα', ctaLink: { route: '/blog' } })
  })
})

describe('blog_posts_list, size under either name', () => {
  it('reads the page size before a count, as its component did', () => {
    const { node } = upgraded('blog_posts_list', { pageSize: 9, count: 6 })

    expect((node.settings.posts as { limit: number }).limit).toBe(9)
  })
})

describe('blog_categories, version 1 to 2', () => {
  it('lists the first ten, as its component drew, and keeps the title', () => {
    const { node, parsed } = upgraded('blog_categories', { title: 'Κατηγορίες' })

    expect(node.type).toBe('blog_categories@2')
    expect(node.settings).toEqual({ title: 'Κατηγορίες', categories: { limit: 10 } })
    expect(parsed.success).toBe(true)
  })
})

describe('blog_posts_list, loadMore', () => {
  const settingsOf = (extra: Record<string, unknown>) => ({ posts: { mode: 'filter', ordering: 'newest', limit: 9 }, ...extra })

  it('is an optional setting, so a version 2 node written without it is valid as it is and no version moved', () => {
    const definition = block('blog_posts_list')

    expect(definition.version).toBe(2)
    expect(definition.schema.safeParse(settingsOf({})).success).toBe(true)
    expect(definition.schema.safeParse(settingsOf({ loadMore: true })).success).toBe(true)
  })

  it('is a boolean', () => {
    expect(block('blog_posts_list').schema.safeParse(settingsOf({ loadMore: 'yes' })).success).toBe(false)
  })

  it('belongs to the list alone: the grid and the carousel, which draw no button, drop it from what they keep', () => {
    expect(block('blog_posts_list').schema.parse(settingsOf({ loadMore: true }))).toHaveProperty('loadMore', true)
    expect(block('blog_posts_grid').schema.parse(settingsOf({ loadMore: true }))).not.toHaveProperty('loadMore')
    expect(block('blog_posts_carousel').schema.parse(settingsOf({ loadMore: true }))).not.toHaveProperty('loadMore')
  })
})
