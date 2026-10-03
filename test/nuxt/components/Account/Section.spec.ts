import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Section from '~/components/Account/Section.vue'

/**
 * One section of an account page: a card whose heading labels it (so a
 * screen reader's landmark list names each one), an optional line on
 * what it is for, its own actions, then its content.
 */
describe('Account/Section', () => {
  it('is a region named by its heading', async () => {
    const wrapper = await mountSuspended(Section, {
      props: { title: 'Συνδεδεμένες συσκευές' },
      slots: { default: () => 'rows' },
    })

    const heading = wrapper.get('h2')
    expect(heading.text()).toBe('Συνδεδεμένες συσκευές')
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(wrapper.text()).toContain('rows')
  })

  it('says what the section is for, when told', async () => {
    const wrapper = await mountSuspended(Section, {
      props: { title: 'Passkeys', description: 'Σύνδεση με το πρόσωπό σου.' },
    })

    expect(wrapper.get('h2 + p').text()).toBe('Σύνδεση με το πρόσωπό σου.')
  })

  it('draws no empty line or action row when given neither', async () => {
    const wrapper = await mountSuspended(Section, { props: { title: 'Κωδικός πρόσβασης' } })

    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.findAll('section > div > div')).toHaveLength(1)
  })

  it('places its actions beside the heading', async () => {
    const wrapper = await mountSuspended(Section, {
      props: { title: 'Διευθύνσεις email' },
      slots: { actions: () => h('button', 'Νέο email') },
    })

    expect(wrapper.findAll('section > div > div')[1]!.get('button').text()).toBe('Νέο email')
  })
})
