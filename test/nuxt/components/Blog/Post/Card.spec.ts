import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { resolve } from 'node:path'
import YAML from 'yaml'
import BlogPostCard from '~/components/Blog/Post/Card.vue'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * One post wherever posts are listed: the picture, its category, when
 * and how long, the title as the one link that stretches over the card,
 * and the like and comment controls above it as their own targets.
 */
const flags = vi.hoisted(() => ({ comments: true }))
mockNuxtImport('useSettingFlag', () => () => computed(() => flags.comments))
mockComponent('ButtonBlogPostLike', {
  props: ['blogPostId', 'likesCount'],
  emits: ['update'],
  template: '<button data-stub="like" :data-count="likesCount" @click="$emit(\'update\', { blogPostId, liked: true })" />',
})

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Blog/Post/Card.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const mountCard = (props: Record<string, unknown> = {}) =>
  mountSuspended(BlogPostCard, { route: false, props: { post: makeBlogPost({ id: 7, slug: 'gan' }), ...props }, global: { stubs: { ImgWithFallback: true } } })

beforeEach(() => {
  flags.comments = true
})

describe('Blog/Post/Card', () => {
  it('links the title to the post, and nothing else on the card is that link', async () => {
    const wrapper = await mountCard()

    expect(wrapper.get('h2 a').attributes('href')).toBe('/blog/post/7/gan')
    expect(wrapper.get('h2 a').text()).toBe('Άρθρο 7')
  })

  it('takes the heading level the page outline needs', async () => {
    const wrapper = await mountCard({ headingLevel: 'h3' })

    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.get('h3 a').text()).toBe('Άρθρο 7')
  })

  it('renders as the element the list asks for', async () => {
    const wrapper = await mountCard({ as: 'div' })

    expect(wrapper.element.tagName).toBe('DIV')
  })

  it('names the category when the list knows it, and shows none when it does not', async () => {
    const named = await mountCard({ categoryName: 'Οδηγοί αγοράς' })
    const unnamed = await mountCard()

    expect(named.findComponent({ name: 'UBadge' }).text()).toBe('Οδηγοί αγοράς')
    expect(unnamed.findComponent({ name: 'UBadge' }).exists()).toBe(false)
  })

  it('says when it was published and how long it takes to read', async () => {
    const wrapper = await mountCard({ post: makeBlogPost({ id: 7, slug: 'gan', publishedAt: '2026-09-12T10:00:00Z', readingTime: 6 }) })

    expect(wrapper.get('time').attributes('datetime')).toBe('2026-09-12T10:00:00.000Z')
    expect(wrapper.text()).toContain(messages.reading_time.split(' | ')[1].replace('{minutes}', '6'))
  })

  it('leaves the date and the reading time out when the post has neither', async () => {
    const wrapper = await mountCard({ post: makeBlogPost({ id: 7, slug: 'gan', publishedAt: null, readingTime: 0 }) })

    expect(wrapper.find('time').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('λεπτά')
  })

  it('links the comment count to the post\'s comments, named by how many', async () => {
    const wrapper = await mountCard({ post: makeBlogPost({ id: 7, slug: 'gan', commentsCount: 3 }) })

    const link = wrapper.get('a[href="/blog/post/7/gan#blog-post-comments"]')
    expect(link.text()).toBe('3')
    expect(link.attributes('aria-label')).toBe(messages.comments.split(' | ')[0].replace('{count}', '3'))
  })

  it('has no comment link when the store switched comments off', async () => {
    flags.comments = false

    const wrapper = await mountCard()

    expect(wrapper.find('a[href$="#blog-post-comments"]').exists()).toBe(false)
  })

  it('moves the like count at once when the like button reports a like', async () => {
    const wrapper = await mountCard({ post: makeBlogPost({ id: 7, slug: 'gan', likesCount: 4 }) })
    expect(wrapper.get('[data-stub="like"]').attributes('data-count')).toBe('4')

    await wrapper.get('[data-stub="like"]').trigger('click')

    expect(wrapper.get('[data-stub="like"]').attributes('data-count')).toBe('5')
  })
})
