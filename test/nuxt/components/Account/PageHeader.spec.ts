import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AccountPageHeader from '~/components/Account/PageHeader.vue'

/** An account page's heading: the one h1, a line under it, the page's own actions. */
describe('Account/PageHeader', () => {
  it('heads the page with its title as the one h1 and the lead under it', async () => {
    const wrapper = await mountSuspended(AccountPageHeader, { props: { title: 'Παραγγελίες', lead: '4 παραγγελίες' } })

    expect(wrapper.findAll('h1').map(heading => heading.text())).toEqual(['Παραγγελίες'])
    expect(wrapper.get('p').text()).toBe('4 παραγγελίες')
  })

  it('takes markup for the lead from its slot', async () => {
    const wrapper = await mountSuspended(AccountPageHeader, {
      props: { title: 'Παραγγελία #3' },
      slots: { lead: () => h('time', { datetime: '2026-10-01' }, '1 Οκτ 2026') },
    })

    expect(wrapper.get('p time').text()).toBe('1 Οκτ 2026')
  })

  it('draws no lead and no actions it was not given', async () => {
    const wrapper = await mountSuspended(AccountPageHeader, { props: { title: 'Διευθύνσεις' } })

    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.findAll('header > div')).toHaveLength(1)
  })

  it('sets the page\'s actions beside the heading', async () => {
    const wrapper = await mountSuspended(AccountPageHeader, {
      props: { title: 'Διευθύνσεις' },
      slots: { actions: () => h('button', 'Νέα διεύθυνση') },
    })

    expect(wrapper.get('header > div:last-child button').text()).toBe('Νέα διεύθυνση')
  })
})
