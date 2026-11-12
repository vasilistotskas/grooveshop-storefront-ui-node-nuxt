import { describe, it, expect, beforeEach } from 'vitest'
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
