import { describe, it, expect } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Item from '~/components/Account/Notifications/Item.vue'
import { makeNotificationUserDetail } from '~~/test/fixtures/user'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * One notification row: an icon for what it is about, its title and
 * message, a dot (named for a screen reader) only while unread, and the
 * two things it can ask for — to be opened, to be flipped read/unread.
 */
// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Account/Notifications/Item.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const mountRow = (row = makeNotificationUserDetail()) => mountSuspended(Item, { props: { row }, route: false })
const tileIcon = (wrapper: Awaited<ReturnType<typeof mountRow>>) => wrapper.findComponent({ name: 'UIcon' }).props('name')

describe('Account/Notifications/Item', () => {
  it.each([
    ['ORDER', 'i-lucide-shopping-bag'],
    ['SHIPPING', 'i-lucide-truck'],
    ['PROMOTION', 'i-lucide-tag'],
    ['WISHLIST', 'i-lucide-heart'],
    ['SECURITY', 'i-lucide-lock'],
  ] as const)('draws a %s notification with its own icon', async (category, icon) => {
    const wrapper = await mountRow(makeNotificationUserDetail({ notification: { category } }))

    expect(tileIcon(wrapper)).toBe(icon)
  })

  it('draws a bell for a notification with no known category', async () => {
    const wrapper = await mountRow(makeNotificationUserDetail({ notification: { category: undefined } }))

    expect(tileIcon(wrapper)).toBe('i-lucide-bell')
  })

  it('names the unread dot for a screen reader, and has none once read', async () => {
    const unread = await mountRow(makeNotificationUserDetail({ seen: false }))
    const read = await mountRow(makeNotificationUserDetail({ seen: true }))

    expect(unread.get('.sr-only').text()).toBe(messages.unread)
    expect(read.find('.sr-only').exists()).toBe(false)
  })

  it('offers to mark an unread row read and a read row unread', async () => {
    const unread = await mountRow(makeNotificationUserDetail({ seen: false }))
    const read = await mountRow(makeNotificationUserDetail({ seen: true }))

    expect(unread.find(`button[aria-label="${messages.mark_seen}"]`).exists()).toBe(true)
    expect(read.find(`button[aria-label="${messages.mark_unseen}"]`).exists()).toBe(true)
  })

  it('emits open from the text and toggle from the button, each alone', async () => {
    const wrapper = await mountRow(makeNotificationUserDetail({ notification: { translations: { el: { title: 'Τίτλος', message: 'Μήνυμα' } } } }))

    await wrapper.findAll('button').find(button => button.text().includes('Τίτλος'))!.trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(wrapper.emitted('toggle')).toBeUndefined()

    await wrapper.get('button[aria-label]').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('says it opens somewhere only when the notification links out', async () => {
    const linked = await mountRow(makeNotificationUserDetail({ notification: { link: '/account/orders/42' } }))
    const plain = await mountRow(makeNotificationUserDetail({ notification: { link: null } }))

    expect(linked.text()).toContain(messages.open)
    expect(plain.text()).not.toContain(messages.open)
  })
})
