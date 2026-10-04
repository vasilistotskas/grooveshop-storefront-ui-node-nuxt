import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import HoursCard from '~/components/Contact/HoursCard.vue'

/**
 * The week's opening hours beside the contact form: today marked, an
 * open/closed badge in words, a closed day said as closed, and nothing
 * for a store with no published hours.
 */
type Entry = { opens: string, closes: string } | null

const hours = vi.hoisted(() => ({
  hasData: true,
  isOpen: true,
  today: 'wed' as string | null,
  schedule: null as Record<string, { opens: string, closes: string } | null> | null,
}))

mockNuxtImport('useBusinessHours', () => () => ({
  hasData: computed(() => hours.hasData),
  isOpen: computed(() => hours.isOpen),
  today: computed(() => hours.today),
  schedule: computed(() => hours.schedule),
}))

const OPEN: Entry = { opens: '09:00', closes: '20:00' }

beforeEach(() => {
  Object.assign(hours, {
    hasData: true,
    isOpen: true,
    today: 'wed',
    schedule: { mon: OPEN, tue: OPEN, wed: OPEN, thu: OPEN, fri: OPEN, sat: { opens: '10:00', closes: '15:00' }, sun: null },
  })
})

async function mount() {
  return mountSuspended(HoursCard, { route: false })
}

describe('Contact/HoursCard', () => {
  it('lists the seven days with their hours, a closed day as closed', async () => {
    const wrapper = await mount()

    const rows = wrapper.findAll('li').map(row => row.findAll('span').map(cell => cell.text()))
    expect(rows).toEqual([
      ['Δευτέρα', '09:00–20:00'],
      ['Τρίτη', '09:00–20:00'],
      ['Τετάρτη', '09:00–20:00'],
      ['Πέμπτη', '09:00–20:00'],
      ['Παρασκευή', '09:00–20:00'],
      ['Σάββατο', '10:00–15:00'],
      ['Κυριακή', 'Κλειστά'],
    ])
  })

  it('marks today, and only today', async () => {
    const wrapper = await mount()

    const marked = wrapper.findAll('li[aria-current="date"]')
    expect(marked.map(row => row.text())).toEqual([expect.stringContaining('Τετάρτη')])
  })

  it('says in words whether the store is open now', async () => {
    const open = await mount()
    expect(open.find('[data-slot="base"]').text()).toBe('Ανοιχτά τώρα')

    hours.isOpen = false
    const closed = await mount()
    expect(closed.find('[data-slot="base"]').text()).toBe('Κλειστά τώρα')
  })

  it('draws nothing for a store with no published hours', async () => {
    hours.hasData = false

    const wrapper = await mount()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
