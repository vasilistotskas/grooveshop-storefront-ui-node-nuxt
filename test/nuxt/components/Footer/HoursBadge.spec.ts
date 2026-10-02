import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import FooterHoursBadge from '~/components/Footer/HoursBadge.vue'

/**
 * Whether the store is open now, in words — the colour is never the
 * only signal — with today's closing time when open and today's hours
 * when closed; nothing for a store that published no hours.
 */
const { hours } = vi.hoisted(() => ({
  hours: { hasData: true, isOpen: true, todayHours: { opens: '09:00', closes: '20:00' } as { opens: string, closes: string } | null },
}))

mockNuxtImport('useBusinessHours', () => () => ({
  hasData: computed(() => hours.hasData),
  isOpen: computed(() => hours.isOpen),
  todayHours: computed(() => hours.todayHours),
}))

/** The badge's own copy (el). */
const COPY = { open: 'Ανοιχτά τώρα · έως 20:00', closed: 'Κλειστά τώρα · Σήμερα 09:00–20:00' }

describe('Footer/HoursBadge', () => {
  beforeEach(() => {
    Object.assign(hours, { hasData: true, isOpen: true, todayHours: { opens: '09:00', closes: '20:00' } })
  })

  it('says it is open, and until when', async () => {
    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    expect(wrapper.text().replace(/\s+/g, ' ')).toBe(COPY.open)
  })

  it('says it is closed, with today\'s hours', async () => {
    hours.isOpen = false

    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    expect(wrapper.text().replace(/\s+/g, ' ')).toBe(COPY.closed)
  })

  it('says nothing without published hours', async () => {
    hours.hasData = false

    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    expect(wrapper.text()).toBe('')
  })
})
