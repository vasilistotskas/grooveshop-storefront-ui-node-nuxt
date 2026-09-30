import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { AcsTrackingEvent } from '~~/shared/openapi/types.gen'
import AcsEventTimeline from '~/components/Order/AcsEventTimeline.vue'
import { FIXTURE_TIMESTAMP } from '~~/test/fixtures/product'

const event = (id: number, overrides: Partial<AcsTrackingEvent> = {}): AcsTrackingEvent => ({
  id,
  eventTime: FIXTURE_TIMESTAMP,
  checkpointAction: `ACTION ${id}`,
  checkpointLocation: '',
  notes: '',
  receivedAt: FIXTURE_TIMESTAMP,
  ...overrides,
})

describe('Order/AcsEventTimeline', () => {
  it('says there are no tracking events yet for an empty list', async () => {
    const wrapper = await mountSuspended(AcsEventTimeline, { props: { events: [] }, route: false })

    expect(wrapper.text()).toBe(useNuxtApp().$i18n.t('tracking.acs.no_events'))
    expect(wrapper.find('time').exists()).toBe(false)
  })

  it('renders the courier\'s own checkpoint text in order, with the time of each', async () => {
    const events = [
      event(1, { checkpointAction: 'ΠΑΡΑΛΑΒΗ', checkpointLocation: 'ΘΕΣΣΑΛΟΝΙΚΗ', eventTime: '2026-01-14T08:00:00Z' }),
      event(2, { checkpointAction: 'ΣΕ ΔΙΑΝΟΜΗ', checkpointLocation: 'ΑΘΗΝΑ', eventTime: '2026-01-15T10:30:00Z' }),
    ]

    const wrapper = await mountSuspended(AcsEventTimeline, { props: { events }, route: false })

    expect(wrapper.findAll('[data-slot="title"]').map(title => title.text())).toEqual(['ΠΑΡΑΛΑΒΗ', 'ΣΕ ΔΙΑΝΟΜΗ'])
    expect(wrapper.findAll('[data-slot="description"]').map(d => d.text())).toEqual(['ΘΕΣΣΑΛΟΝΙΚΗ', 'ΑΘΗΝΑ'])
    expect(wrapper.findAll('time').map(time => time.attributes('datetime')))
      .toEqual(['2026-01-14T08:00:00.000Z', '2026-01-15T10:30:00.000Z'])
  })

  it('falls back to the courier\'s notes when a checkpoint has no location', async () => {
    const events = [event(1, { checkpointLocation: '', notes: 'Απών παραλήπτης' })]

    const wrapper = await mountSuspended(AcsEventTimeline, { props: { events }, route: false })

    expect(wrapper.get('[data-slot="description"]').text()).toBe('Απών παραλήπτης')
  })
})
