import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BoxNowEventTimeline from '~/components/Order/BoxNowEventTimeline.vue'
import { makeBoxNowParcelEvent } from '~~/test/fixtures/boxnow'

const t = (key: string) => useNuxtApp().$i18n.t(key)

describe('Order/BoxNowEventTimeline', () => {
  it('says there are no tracking events yet, and draws no timeline, for an empty list', async () => {
    const wrapper = await mountSuspended(BoxNowEventTimeline, { props: { events: [] }, route: false })

    expect(wrapper.text()).toBe(t('tracking.boxnow.no_events'))
    expect(wrapper.find('time').exists()).toBe(false)
  })

  it('renders one entry per event, in the order given: state label, place and time', async () => {
    const events = [
      makeBoxNowParcelEvent({ id: 1, eventType: 'new', eventTime: '2026-01-15T10:30:00Z', displayName: 'Athens DC' }),
      makeBoxNowParcelEvent({ id: 2, eventType: 'in_depot', eventTime: '2026-01-15T14:00:00Z', displayName: 'North Depot' }),
      makeBoxNowParcelEvent({ id: 3, eventType: 'final_destination', eventTime: '2026-01-16T09:00:00Z', displayName: 'Χαλάνδρι ΟΠΑΠ Play' }),
    ]

    const wrapper = await mountSuspended(BoxNowEventTimeline, { props: { events }, route: false })

    expect(wrapper.findAll('[data-slot="title"]').map(title => title.text())).toEqual([
      t('tracking.boxnow.state.new'),
      t('tracking.boxnow.state.in_depot'),
      t('tracking.boxnow.state.final_destination'),
    ])
    expect(wrapper.findAll('[data-slot="description"]').map(d => d.text()))
      .toEqual(['Athens DC', 'North Depot', 'Χαλάνδρι ΟΠΑΠ Play'])
    expect(wrapper.findAll('time').map(time => time.attributes('datetime')))
      .toEqual(['2026-01-15T10:30:00.000Z', '2026-01-15T14:00:00.000Z', '2026-01-16T09:00:00.000Z'])
  })

  it('names the place by postal code when BoxNow sent no display name', async () => {
    const events = [
      makeBoxNowParcelEvent({ id: 1, displayName: '', postalCode: '15234' }),
      makeBoxNowParcelEvent({ id: 2, displayName: '', postalCode: '' }),
    ]

    const wrapper = await mountSuspended(BoxNowEventTimeline, { props: { events }, route: false })

    const items = wrapper.findAll('[data-slot="item"]')
    expect(items).toHaveLength(2)
    expect(items[0]!.find('[data-slot="description"]').text()).toBe('15234')
    expect(items[1]!.find('[data-slot="description"]').exists()).toBe(false)
  })
})
