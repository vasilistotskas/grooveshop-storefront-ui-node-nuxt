import { describe, it, expect } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OrderProgress from '~/components/Order/Progress.vue'

/**
 * How far an order has come: one segment per step of the order flow,
 * filled up to the status reached, the step reached marked current.
 * The fill is the contract (happy-dom computes no colours), so the
 * reached segments are counted by their fill class.
 */
const filled = (wrapper: VueWrapper) =>
  wrapper.findAll('li > span:first-child').filter(segment => segment.classes().includes('bg-secondary')).length

describe('Order/Progress', () => {
  it.each([
    ['PENDING', 1],
    ['PROCESSING', 2],
    ['SHIPPED', 3],
    ['DELIVERED', 4],
    ['COMPLETED', 5],
  ] as const)('fills the strip up to %s', async (status, reached) => {
    const wrapper = await mountSuspended(OrderProgress, { props: { status } })

    expect(wrapper.findAll('li')).toHaveLength(5)
    expect(filled(wrapper)).toBe(reached)
    expect(wrapper.findAll('li')[reached - 1]!.attributes('aria-current')).toBe('step')
    expect(wrapper.get('ol').attributes('aria-label')).toBe(`Βήμα ${reached} από 5`)
  })

  it.each(['CANCELED', 'RETURNED', 'REFUNDED'] as const)('draws nothing for an order that %s', async (status) => {
    const wrapper = await mountSuspended(OrderProgress, { props: { status } })

    expect(wrapper.find('ol').exists()).toBe(false)
  })

  it('names every step with labels, and the step reached again for a phone', async () => {
    const wrapper = await mountSuspended(OrderProgress, { props: { status: 'SHIPPED', labels: true } })

    expect(wrapper.findAll('li').map(step => step.text())).toEqual([
      'Καταχωρήθηκε', 'Σε επεξεργασία', 'Στάλθηκε', 'Παραδόθηκε', 'Ολοκληρώθηκε',
    ])
    expect(wrapper.get('p').text()).toBe('Στάλθηκε')
  })

  it('names nothing without labels', async () => {
    const wrapper = await mountSuspended(OrderProgress, { props: { status: 'SHIPPED' } })

    expect(wrapper.text()).toBe('')
  })
})
