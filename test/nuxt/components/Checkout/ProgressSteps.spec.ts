import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ProgressSteps from '~/components/Checkout/ProgressSteps.vue'

/**
 * The checkout's four-step progress over its three pages. A step the
 * shopper passed, or the very next page, can be asked for — the page
 * decides whether to move — and Review lights on the payment page once
 * a payment method is chosen.
 */
const mount = (current: number, paymentChosen = false) =>
  mountSuspended(ProgressSteps, { route: false, props: { current, paymentChosen } })

const steps = (wrapper: VueWrapper) => wrapper.findAll('li')

/** Per step: whether it is reached (its bar filled), done (said so to assistive tech) and a control. */
const states = (wrapper: VueWrapper) => steps(wrapper).map(step => ({
  reached: step.find('.bg-secondary').exists(),
  done: step.find('.sr-only').exists(),
  control: step.find('button').exists(),
}))

describe('Checkout/ProgressSteps', () => {
  it('names the four steps in order, in the page\'s language', async () => {
    const wrapper = await mount(0)

    expect(steps(wrapper).map(step => step.text().replace(/^\d/, ''))).toEqual(['Στοιχεία', 'Αποστολή', 'Πληρωμή', 'Έλεγχος'])
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Βήματα ολοκλήρωσης')
  })

  it('on the details page offers only the delivery step', async () => {
    const wrapper = await mount(0)

    expect(states(wrapper)).toEqual([
      { reached: true, done: false, control: false },
      { reached: false, done: false, control: true },
      { reached: false, done: false, control: false },
      { reached: false, done: false, control: false },
    ])
  })

  it('on the delivery page ticks the details and offers both neighbours', async () => {
    const wrapper = await mount(1)

    expect(states(wrapper)).toEqual([
      { reached: true, done: true, control: true },
      { reached: true, done: false, control: false },
      { reached: false, done: false, control: true },
      { reached: false, done: false, control: false },
    ])
  })

  it('lights Review once a payment method is chosen on the payment page', async () => {
    const before = await mount(2, false)
    const after = await mount(2, true)

    expect(states(before)[3]).toEqual({ reached: false, done: false, control: false })
    expect(states(before)[2]!.done).toBe(false)
    expect(states(after)[3]).toEqual({ reached: true, done: false, control: false })
    expect(states(after)[2]!.done).toBe(true)
  })

  it('marks the page on screen as the current step', async () => {
    const wrapper = await mount(1)

    expect(steps(wrapper).map(step => step.find('[aria-current="step"]').exists())).toEqual([false, true, false, false])
  })

  it('says which steps are done to assistive tech', async () => {
    const wrapper = await mount(2)

    expect(steps(wrapper)[0]!.find('.sr-only').text()).toBe('(ολοκληρώθηκε)')
    expect(steps(wrapper)[2]!.find('.sr-only').exists()).toBe(false)
  })

  it('asks for the page a step stands for', async () => {
    const wrapper = await mount(1)

    await steps(wrapper)[0]!.get('button').trigger('click')
    await steps(wrapper)[2]!.get('button').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[0], [2]])
  })
})
