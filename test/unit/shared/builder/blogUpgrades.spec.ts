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
