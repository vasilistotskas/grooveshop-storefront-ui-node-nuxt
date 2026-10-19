import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ApiErrorAlert from '~/components/ApiErrorAlert.vue'

const error = (overrides: Partial<DescribedApiError> = {}): DescribedApiError => ({
  title: 'Η πληρωμή απέτυχε',
  description: 'Η κάρτα απορρίφθηκε.',
  fieldErrors: [],
  serverFault: false,
  ...overrides,
})

describe('ApiErrorAlert', () => {
  it('renders nothing without a failure', async () => {
    const wrapper = await mountSuspended(ApiErrorAlert, { props: { error: null } })

    expect(wrapper.text()).toBe('')
  })

  it('says the action and the reason, in place, as an alert', async () => {
    const wrapper = await mountSuspended(ApiErrorAlert, { props: { error: error() } })

    expect(wrapper.get('[role="alert"]').text()).toContain('Η πληρωμή απέτυχε')
    expect(wrapper.text()).toContain('Η κάρτα απορρίφθηκε.')
  })

  it('keeps the code and the request id behind «Λεπτομέρειες»', async () => {
    const wrapper = await mountSuspended(ApiErrorAlert, { props: { error: error({ code: 'card_declined', requestId: 'req-8' }) } })

    const details = wrapper.findAll('button').find(button => button.text() === 'Λεπτομέρειες')!
    expect(wrapper.text()).not.toContain('card_declined')

    await details.trigger('click')

    expect(wrapper.text()).toContain('Κωδικός: card_declined')
    expect(wrapper.text()).toContain('Αναγνωριστικό αιτήματος: req-8')
  })

  it('offers no details when there is neither a code nor a request id', async () => {
    const wrapper = await mountSuspended(ApiErrorAlert, { props: { error: error() } })

    expect(wrapper.findAll('button').some(button => button.text() === 'Λεπτομέρειες')).toBe(false)
  })

  it('takes the headline from the caller when given one', async () => {
    const wrapper = await mountSuspended(ApiErrorAlert, { props: { error: error(), title: 'Άλλος τίτλος' } })

    expect(wrapper.text()).toContain('Άλλος τίτλος')
  })
})
