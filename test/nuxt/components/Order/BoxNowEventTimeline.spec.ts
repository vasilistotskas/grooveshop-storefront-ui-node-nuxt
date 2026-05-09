/**
 * Tests for Order/BoxNowEventTimeline.vue component.
 *
 * Renders either a "no events" alert or a UTimeline with one item per event.
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BoxNowEventTimeline from '~/components/Order/BoxNowEventTimeline.vue'

// ---------------------------------------------------------------------------
// Test fixtures — partial shapes cast to any; full type is BoxNowParcelEvent
// ---------------------------------------------------------------------------

const SINGLE_EVENT = {
  id: 1,
  eventType: 'new',
  eventTime: '2024-01-15T10:30:00Z',
  displayName: 'Athens Distribution Centre',
  postalCode: '10431',
} as any

const MULTIPLE_EVENTS = [
  {
    id: 1,
    eventType: 'new',
    eventTime: '2024-01-15T10:30:00Z',
    displayName: 'Athens DC',
    postalCode: '10431',
  },
  {
    id: 2,
    eventType: 'in_depot',
    eventTime: '2024-01-15T14:00:00Z',
    displayName: 'North Depot',
    postalCode: '14122',
  },
  {
    id: 3,
    eventType: 'final_destination',
    eventTime: '2024-01-16T09:00:00Z',
    displayName: 'Χαλάνδρι ΟΠΑΠ Play',
    postalCode: '15234',
  },
] as any[]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Order/BoxNowEventTimeline', () => {
  describe('empty events array', () => {
    it('renders the "no events" UAlert when events array is empty', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: [] },
      })

      const alert = wrapper.findComponent({ name: 'UAlert' })
      expect(alert.exists()).toBe(true)
    })

    it('does NOT render UTimeline when events array is empty', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: [] },
      })

      const timeline = wrapper.findComponent({ name: 'UTimeline' })
      expect(timeline.exists()).toBe(false)
    })

    it('the no-events alert uses neutral color', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: [] },
      })

      const alert = wrapper.findComponent({ name: 'UAlert' })
      expect(alert.props('color')).toBe('neutral')
    })
  })

  describe('non-empty events array', () => {
    it('renders UTimeline (not UAlert) when events are provided', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: [SINGLE_EVENT] },
      })

      const timeline = wrapper.findComponent({ name: 'UTimeline' })
      expect(timeline.exists()).toBe(true)

      const alert = wrapper.findComponent({ name: 'UAlert' })
      expect(alert.exists()).toBe(false)
    })

    it('passes correct number of items to UTimeline for one event', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: [SINGLE_EVENT] },
      })

      const timeline = wrapper.findComponent({ name: 'UTimeline' })
      const items = timeline.props('items') as unknown[]
      expect(items).toHaveLength(1)
    })

    it('passes one item per event to UTimeline for multiple events', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: MULTIPLE_EVENTS },
      })

      const timeline = wrapper.findComponent({ name: 'UTimeline' })
      const items = timeline.props('items') as unknown[]
      expect(items).toHaveLength(MULTIPLE_EVENTS.length)
    })

    it('UTimeline items contain the displayName from each event', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: MULTIPLE_EVENTS },
      })

      const timeline = wrapper.findComponent({ name: 'UTimeline' })
      const items = timeline.props('items') as Array<{ description: string }>

      // Events with displayName set should populate the description field
      expect(items[0]!.description).toBe('Athens DC')
      expect(items[1]!.description).toBe('North Depot')
      expect(items[2]!.description).toBe('Χαλάνδρι ΟΠΑΠ Play')
    })

    it('uses UTimeline orientation="vertical"', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: [SINGLE_EVENT] },
      })

      const timeline = wrapper.findComponent({ name: 'UTimeline' })
      expect(timeline.props('orientation')).toBe('vertical')
    })

    it('events appear in the order they were passed (no reordering)', async () => {
      const wrapper = await mountSuspended(BoxNowEventTimeline, {
        props: { events: MULTIPLE_EVENTS },
      })

      const timeline = wrapper.findComponent({ name: 'UTimeline' })
      const items = timeline.props('items') as Array<{ description: string }>

      // Verify order is preserved
      expect(items[0]!.description).toBe('Athens DC')
      expect(items[2]!.description).toBe('Χαλάνδρι ΟΠΑΠ Play')
    })
  })
})
