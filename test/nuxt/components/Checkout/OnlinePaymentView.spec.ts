import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import OnlinePaymentView from '~/components/Checkout/OnlinePaymentView.vue'
import { makeOrder } from '~~/test/fixtures/order'
import { makePayWay } from '~~/test/fixtures/payWay'

/**
 * Shown once the order exists, for Stripe and Viva: which provider's
 * component takes over (Viva's redirect or Stripe's hosted page), and
 * what is forwarded from it. The providers' own
 * flows are specced with them; here each is a button that fires its events.
 */
mockComponent('VivaWalletCheckout', {
  emits: ['error', 'redirecting'],
  template: '<button data-provider="viva" @click="$emit(\'error\', \'viva failed\')">viva</button>',
})
mockComponent('StripeCheckout', {
  emits: ['error', 'redirecting'],
  template: '<button data-provider="stripe-hosted" @click="$emit(\'error\', \'hosted failed\')">hosted</button>',
})

const order = makeOrder({ id: 4812 })

const mountView = (flags: { stripe?: boolean, viva?: boolean }) =>
  mountSuspended(OnlinePaymentView, {
    route: false,
    props: {
      createdOrder: order,
      selectedPayWay: makePayWay({ providerCode: flags.viva ? 'viva_wallet' : 'stripe', settlement: 'online' }),
      isStripePayment: flags.stripe ?? false,
      isVivaWalletPayment: flags.viva ?? false,
    },
  })

const providers = (wrapper: VueWrapper) => wrapper.findAll('[data-provider]').map(node => node.attributes('data-provider'))

describe('Checkout/OnlinePaymentView', () => {
  it('names the order it is collecting for', async () => {
    const wrapper = await mountView({ viva: true })

    expect(wrapper.text()).toContain('#4812')
  })

  it('hands a Viva order to Viva and forwards its failure', async () => {
    const wrapper = await mountView({ viva: true })

    expect(providers(wrapper)).toEqual(['viva'])
    await wrapper.get('[data-provider="viva"]').trigger('click')
    expect(wrapper.emitted('payment-error')).toEqual([['viva failed']])
  })

  it('hands a Stripe order to its hosted page and forwards its failure', async () => {
    const wrapper = await mountView({ stripe: true })

    await vi.waitFor(() => expect(providers(wrapper)).toEqual(['stripe-hosted']))
    await wrapper.get('[data-provider="stripe-hosted"]').trigger('click')
    expect(wrapper.emitted('payment-error')).toEqual([['hosted failed']])
  })

  it('shows no provider for an order that is not paid online', async () => {
    const wrapper = await mountView({})

    expect(providers(wrapper)).toEqual([])
  })

  it('goes back to the form', async () => {
    const wrapper = await mountView({ viva: true })

    await wrapper.findAll('button').find(button => button.text() === 'Επιστροφή')!.trigger('click')

    expect(wrapper.emitted('back-to-form')).toHaveLength(1)
  })
})
