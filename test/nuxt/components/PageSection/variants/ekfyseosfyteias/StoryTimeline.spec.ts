import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StoryTimeline from '~/components/PageSection/variants/ekfyseosfyteias/StoryTimeline.vue'

/**
 * The dated list is an ordered list: a row per entry, in the order the
 * operator wrote them, with the date, title and text of each.
 */
const ITEMS = [
  { date: 'Σεπτ. 2024', title: '88η ΔΕΘ', text: 'Παρουσίαση και γευσιγνωσία.' },
  { date: 'Οκτ. 2024', title: 'Local Tour' },
  { title: 'Χωρίς ημερομηνία' },
]

describe('ekfyseosfyteias story_timeline', () => {
  it('lists the entries in order, each with its date, title and text', async () => {
    const wrapper = await mountSuspended(StoryTimeline, {
      route: false,
      props: { heading: 'Η Φυτειά στο τραπέζι της Ημαθίας', items: ITEMS },
    })

    expect(wrapper.find('h2').text()).toBe('Η Φυτειά στο τραπέζι της Ημαθίας')
    expect(wrapper.findAll('ol > li').map(li => li.text())).toEqual([
      'Σεπτ. 2024' + '88η ΔΕΘ' + 'Παρουσίαση και γευσιγνωσία.',
      'Οκτ. 2024' + 'Local Tour',
      'Χωρίς ημερομηνία',
    ])
  })

  it('prints the subheading under the heading', async () => {
    const wrapper = await mountSuspended(StoryTimeline, {
      route: false,
      props: { heading: 'Εκθέσεις', subheading: 'Όπου μας συναντάτε.', items: ITEMS },
    })

    expect(wrapper.text()).toContain('Όπου μας συναντάτε.')
  })

  it('takes the section title when there is no heading', async () => {
    const wrapper = await mountSuspended(StoryTimeline, { route: false, props: { title: 'Εκθέσεις', items: ITEMS } })

    expect(wrapper.find('h2').text()).toBe('Εκθέσεις')
  })

  it('draws the list alone when the section has no heading', async () => {
    const wrapper = await mountSuspended(StoryTimeline, { route: false, props: { items: ITEMS } })

    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.findAll('ol > li')).toHaveLength(ITEMS.length)
  })

  it('renders nothing without entries', async () => {
    const wrapper = await mountSuspended(StoryTimeline, { route: false, props: { heading: 'Κενό', items: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
