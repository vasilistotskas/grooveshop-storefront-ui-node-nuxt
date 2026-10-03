import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AccountLoadError from '~/components/Account/LoadError.vue'

/** An account list that could not load: said as an alert, with a way to try again. */
describe('Account/LoadError', () => {
  it('says what did not load, as an alert', async () => {
    const wrapper = await mountSuspended(AccountLoadError, { props: { message: 'Οι παραγγελίες δεν φορτώθηκαν.' } })

    expect(wrapper.get('[role="alert"]').text()).toContain('Οι παραγγελίες δεν φορτώθηκαν.')
  })

  it('asks for another try', async () => {
    const wrapper = await mountSuspended(AccountLoadError, { props: { message: 'x' } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
