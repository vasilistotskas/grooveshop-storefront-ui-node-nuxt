import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogPostsLoadMore from '~/components/PageSection/BlogPostsLoadMore.vue'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { button: 'Φόρτωση περισσότερων άρθρων', loadedOne: 'Προστέθηκε ένα άρθρο', loadedMany: 'Προστέθηκαν 3 άρθρα' }

const mountMore = (props: { hasMore?: boolean, loading?: boolean, added?: number } = {}, slots: Record<string, string> = {}) =>
  mountSuspended(BlogPostsLoadMore, {
    route: false,
    attachTo: document.body,
    props: { hasMore: true, loading: false, added: 0, ...props },
    slots,
  })

/**
 * The button of a blog band that goes on with its list. It is a real button
 * that stays enabled while a page is read, so the keyboard's focus is not
 * lost to it; what a page added is announced; and when the last page takes
 * the button away, the focus has somewhere to go.
 */
describe('PageSection/BlogPostsLoadMore', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('asks to load more through a button, which says so', async () => {
    const wrapper = await mountMore()

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').text()).toBe(COPY.button)
    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('stays enabled while a page is read and says it is busy', async () => {
    const wrapper = await mountMore({ loading: true })

    const button = wrapper.get('button')

    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.attributes('aria-busy')).toBe('true')
  })

  it('draws no button when there is no more', async () => {
    const wrapper = await mountMore({ hasMore: false })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('tells a screen reader how many posts a page added, politely', async () => {
    const wrapper = await mountMore({ added: 1 })
    const status = wrapper.get('[role="status"]')

    expect(status.text()).toBe(COPY.loadedOne)

    await wrapper.setProps({ added: 3 })

    expect(status.text()).toBe(COPY.loadedMany)
  })

  it('says nothing before a page has been read', async () => {
    const wrapper = await mountMore()

    expect(wrapper.get('[role="status"]').text()).toBe('')
  })

  it('moves the focus to its block when the last page takes the button it was on', async () => {
    const wrapper = await mountMore()
    wrapper.get('button').element.focus()

    await wrapper.setProps({ hasMore: false })
    await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.element))
  })

  it('leaves the focus where it is when the shopper was not on the button', async () => {
    const elsewhere = document.createElement('input')
    document.body.append(elsewhere)
    const wrapper = await mountMore()
    elsewhere.focus()

    await wrapper.setProps({ hasMore: false })
    await nextTick()
    await nextTick()

    expect(document.activeElement).toBe(elsewhere)
  })

  it('lets a design draw the button, and hands it what it needs to', async () => {
    const wrapper = await mountMore({ loading: true }, {
      button: `<template #button="{ load, loading, label }"><a data-own :data-busy="loading" @click="load">{{ label }}</a></template>`,
    })

    await wrapper.get('[data-own]').trigger('click')

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.get('[data-own]').attributes('data-busy')).toBe('true')
    expect(wrapper.get('[data-own]').text()).toBe(COPY.button)
    expect(wrapper.emitted('load')).toHaveLength(1)
  })
})
