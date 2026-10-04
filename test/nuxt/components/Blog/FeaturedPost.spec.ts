import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { resolve } from 'node:path'
import YAML from 'yaml'
import FeaturedPost from '~/components/Blog/FeaturedPost.vue'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The post that opens the blog index: tagged "Featured", with its
 * category, a title that is the one link, the subtitle as the lead, and
 * when it was published and how long it takes to read.
 */
const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Blog/FeaturedPost.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const post = makeBlogPost({
  id: 3,
  slug: 'mah',
  translations: { el: { title: 'Τι σημαίνει mAh', subtitle: 'Διάβασε τα νούμερα.' } },
  publishedAt: '2026-09-12T10:00:00Z',
  readingTime: 6,
})

const mountFeatured = (props: Record<string, unknown> = {}) =>
  mountSuspended(FeaturedPost, { route: false, props: { post, ...props }, global: { stubs: { ImgWithFallback: true } } })

describe('Blog/FeaturedPost', () => {
  it('is tagged featured, with its title as the one link to the post and its subtitle as the lead', async () => {
    const wrapper = await mountFeatured()

    expect(wrapper.text()).toContain(messages.featured)
    expect(wrapper.get('h2 a').attributes('href')).toBe('/blog/post/3/mah')
    expect(wrapper.get('h2 a').text()).toBe('Τι σημαίνει mAh')
    expect(wrapper.text()).toContain('Διάβασε τα νούμερα.')
    expect(wrapper.findAll('a')).toHaveLength(1)
  })

  it('names the category when it is known, and shows only the featured tag when it is not', async () => {
    const named = await mountFeatured({ categoryName: 'Οδηγοί αγοράς' })
    const unnamed = await mountFeatured()

    expect(named.findAllComponents({ name: 'UBadge' }).map(badge => badge.text())).toEqual([messages.featured, 'Οδηγοί αγοράς'])
    expect(unnamed.findAllComponents({ name: 'UBadge' }).map(badge => badge.text())).toEqual([messages.featured])
  })

  it('says when it was published and how long it takes to read', async () => {
    const wrapper = await mountFeatured()

    expect(wrapper.get('time').attributes('datetime')).toBe('2026-09-12T10:00:00.000Z')
    expect(wrapper.text()).toContain(messages.reading_time.split(' | ')[1].replace('{minutes}', '6'))
  })

  it('has no lead without a subtitle', async () => {
    const wrapper = await mountFeatured({ post: makeBlogPost({ id: 3, slug: 'mah', translations: { el: { title: 'Τι σημαίνει mAh', subtitle: '' } } }) })

    expect(wrapper.findAll('p').map(p => p.text())).toHaveLength(2)
  })
})
