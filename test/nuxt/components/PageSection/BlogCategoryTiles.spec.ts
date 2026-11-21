import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogCategoryTiles from '~/components/PageSection/BlogCategoryTiles.vue'
import { makeBlogCategory } from '~~/test/fixtures/blog'
import { setTenant } from '~~/test/helpers/tenant'
import { inlineT } from '~~/test/helpers/inlineCopy'

/**
 * The `tiles` layout of `blog_categories`, the same in every design: each
 * category's icon (or its picture), its whole name, its post count, and a
 * link to the category; the heading, sub-line and call to action are the
 * band's.
 */
const t = inlineT('app/components/PageSection/BlogCategoryTiles.vue')

const LONG = 'Τεχνητή νοημοσύνη και εργαλεία παραγωγικότητας'

const categories = (items: BlogCategory[]) => ({
  status: items.length ? 'ok' : 'empty',
  items,
  total: items.length,
  descriptor: { limit: 10 },
}) as ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>

const ITEMS = [
  makeBlogCategory({ id: 3, slug: 'ai', postCount: 26, translations: { el: { name: LONG } } as BlogCategory['translations'], mainImagePath: 'media/uploads/blog/robot-solid.svg' }),
  makeBlogCategory({ id: 4, slug: 'web', postCount: 1, translations: { el: { name: 'Web' } } as BlogCategory['translations'], mainImagePath: 'media/test/uploads/blog/web.png' }),
]

const mountTiles = (props: Record<string, unknown> = {}) =>
  mountSuspended(BlogCategoryTiles, { route: false, props: { categories: categories(ITEMS), ...props } })

describe('PageSection/BlogCategoryTiles', () => {
  beforeEach(() => {
    setTenant()
  })

  it('draws each category whole, with its post count, linking to the category', async () => {
    const wrapper = await mountTiles()

    const tiles = wrapper.findAll('ul > li')
    expect(tiles).toHaveLength(2)
    expect(tiles[0]!.text()).toContain(LONG)
    expect(tiles[0]!.get('[data-slot="description"]').text()).toBe(t('posts', { count: 26 }, 26))
    expect(tiles[1]!.get('[data-slot="description"]').text()).toBe(t('posts', { count: 1 }, 1))
    expect(t('posts', { count: 26 }, 26)).not.toBe(t('posts', { count: 1 }, 1))
    expect(tiles[0]!.get('a').attributes('href')).toBe('/blog/category/3/ai')
  })

  // The classes are the contract, and the real check is the browser's (no
  // horizontal scroll at 320px): happy-dom lays nothing out. A tile is a
  // container; a narrow one puts the icon above the name, which then has
  // the whole tile, and a word wider than that breaks.
  it('stacks a narrow tile so its name has the tile\'s width', async () => {
    const wrapper = await mountTiles()

    const tile = wrapper.findAll('li')[0]!
    expect(tile.classes()).toContain('@container')
    expect(tile.get('[data-slot="wrapper"]').classes()).toEqual(expect.arrayContaining(['flex-col', '@min-[11rem]:flex-row']))
    expect(tile.get('[data-slot="title"]').classes()).toContain('wrap-break-word')
  })

  it('draws the inlined icon of a category that has one, and its picture otherwise', async () => {
    const wrapper = await mountTiles()

    const [withIcon, withPicture] = wrapper.findAll('ul > li')
    expect(withIcon!.find('img').exists()).toBe(false)
    expect(withPicture!.get('img').attributes('src')).toContain('web.png')
    // On its own ground, not a white square: the tile follows the band's colour scheme.
    expect(withPicture!.get('img').attributes('src')).toMatch(/\/transparent\//)
    // The tile's name says what it is: the picture is decoration.
    expect(withPicture!.get('img').attributes('alt')).toBe('')
  })

  it('carries the band\'s heading, sub-line and call to action', async () => {
    const wrapper = await mountTiles({ title: 'Διάλεξε θέμα', subheading: 'Σύντομα άρθρα.', ctaText: 'Όλα τα άρθρα', ctaLink: '/blog' })

    expect(wrapper.get('h2').text()).toBe('Διάλεξε θέμα')
    expect(wrapper.text()).toContain('Σύντομα άρθρα.')
    expect(wrapper.get('a[href="/blog"]').text()).toContain('Όλα τα άρθρα')
  })

  it('draws no call to action without its link', async () => {
    const wrapper = await mountTiles({ ctaText: 'Όλα τα άρθρα' })

    expect(wrapper.text()).not.toContain('Όλα τα άρθρα')
  })

  it('draws nothing when the blog has no categories', async () => {
    const wrapper = await mountTiles({ categories: categories([]) })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})

/**
 * The bold look (`look: 'bold'`, `PageSection/BlogCategoryTilesBold`, every
 * design): the icon beside the name at every width, no sub-line and no link on
 * a phone; and in either look the link's `{count}` read as the posts the
 * categories hold.
 */
describe('PageSection/BlogCategoryTiles in its bold look', () => {
  beforeEach(() => {
    setTenant()
  })

  it('draws each tile as one link, its icon beside the name and the count', async () => {
    const wrapper = await mountTiles({ look: 'bold' })

    const links = wrapper.findAll('ul a')
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]!.classes()).toEqual(expect.arrayContaining(['flex', 'items-center', 'min-h-15', 'sm:min-h-19']))
    expect(wrapper.findComponent({ name: 'UPageCard' }).exists()).toBe(false)
  })

  it('reads {count} in the link as the posts the categories hold, and keeps the link off a phone', async () => {
    const wrapper = await mountTiles({ look: 'bold', ctaText: 'Όλα τα {count} άρθρα', ctaLink: '/blog', categories: categories([makeBlogCategory({ id: 1, postCount: 26 }), makeBlogCategory({ id: 2, postCount: 61 })]) })

    const link = wrapper.get('a[href="/blog"]')
    expect(link.text()).toBe('Όλα τα 87 άρθρα')
    expect(link.classes()).toContain('max-sm:hidden')
  })

  it('reads {count} in the default look too, and leaves a text without it as typed', async () => {
    const counted = await mountTiles({ ctaText: 'Όλα τα {count} άρθρα', ctaLink: '/blog', categories: categories([makeBlogCategory({ id: 1, postCount: 26 }), makeBlogCategory({ id: 2, postCount: 61 })]) })
    const plain = await mountTiles({ ctaText: 'Όλα τα άρθρα', ctaLink: '/blog' })

    expect(counted.get('a[href="/blog"]').text()).toBe('Όλα τα 87 άρθρα')
    expect(plain.get('a[href="/blog"]').text()).toBe('Όλα τα άρθρα')
  })
})

/**
 * A store's edited wording is the tiles', whatever their look: the bold tiles
 * draw `PageSection/BlogCategoryTiles`' texts.
 */
describe('PageSection/BlogCategoryTiles, a store\u2019s edited texts in either look', () => {
  beforeEach(() => {
    setTenant()
    useTextOverrides().value = { el: { 'components/PageSection/BlogCategoryTiles': { posts: '{count} κείμενο | {count} κείμενα' } } }
  })

  afterEach(() => {
    useTextOverrides().value = undefined
  })

  it.each([
    ['the tiles as they were', {}],
    ['the bold tiles', { look: 'bold' }],
  ])('shows them in %s', async (_case, props) => {
    const wrapper = await mountTiles(props)

    expect(wrapper.text()).toContain('26 κείμενα')
  })
})
