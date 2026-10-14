import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computed, defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

/**
 * The page is rendered once, cached, and served for minutes, so the
 * clock-dependent fields must not be read off the server's clock: they
 * are unknown until the page has mounted in the visitor's browser.
 */
const setting = vi.hoisted(() => ({ value: '' }))

mockNuxtImport('useSettingValue', () => () => computed(() => setting.value))

const HOURS = {
  timezone: 'Europe/Athens',
  schedule: {
    mon: { opens: '10:00', closes: '19:00' },
    tue: { opens: '10:00', closes: '19:00' },
    wed: { opens: '10:00', closes: '19:00' },
    thu: { opens: '10:00', closes: '19:00' },
    fri: { opens: '10:00', closes: '19:00' },
    sat: null,
    sun: null,
  },
}

/** Reads the composable the way a component does, and keeps what the first (pre-mount) render saw. */
function mountReader() {
  const atSetup: Record<string, unknown> = {}
  const Reader = defineComponent({
    setup() {
      const hours = useBusinessHours()
      atSetup.hasData = hours.hasData.value
      atSetup.schedule = hours.schedule.value
      atSetup.today = hours.today.value
      atSetup.todayHours = hours.todayHours.value
      atSetup.isOpen = hours.isOpen.value
      return () => h('p', { 'data-test': 'state' }, JSON.stringify({
        today: hours.today.value,
        todayHours: hours.todayHours.value,
        isOpen: hours.isOpen.value,
      }))
    },
  })
  return { atSetup, mount: () => mountSuspended(Reader, { route: false }) }
}

beforeEach(() => {
  setting.value = JSON.stringify(HOURS)
  vi.useFakeTimers({ toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useBusinessHours', () => {
  it('keeps the schedule in the first render but leaves the clock-dependent fields unknown', async () => {
    // Monday 10:02 in Athens, minutes after a cached page rendered at 09:55.
    vi.setSystemTime(new Date('2026-08-31T07:02:00Z'))
    const { atSetup, mount } = mountReader()

    await mount()

    expect(atSetup).toMatchObject({
      hasData: true,
      schedule: HOURS.schedule,
      today: null,
      todayHours: null,
      isOpen: null,
    })
  })

  it('fills the state in from the visitor\'s clock once mounted', async () => {
    vi.setSystemTime(new Date('2026-08-31T07:02:00Z'))
    const { mount } = mountReader()

    const wrapper = await mount()

    await vi.waitFor(() => expect(JSON.parse(wrapper.get('[data-test="state"]').text())).toEqual({
      today: 'mon',
      todayHours: { opens: '10:00', closes: '19:00' },
      isOpen: true,
    }))
  })

  it('reports closed outside the window once mounted', async () => {
    vi.setSystemTime(new Date('2026-08-31T06:55:00Z'))
    const { mount } = mountReader()

    const wrapper = await mount()

    await vi.waitFor(() => expect(JSON.parse(wrapper.get('[data-test="state"]').text()).isOpen).toBe(false))
  })

  it('has no data for an unset setting or an Intl-unknown timezone, whatever the clock says', async () => {
    setting.value = ''
    const unset = mountReader()
    await unset.mount()
    expect(unset.atSetup.hasData).toBe(false)

    setting.value = JSON.stringify({ ...HOURS, timezone: 'Mars/Olympus' })
    const unknown = mountReader()
    await unknown.mount()
    expect(unknown.atSetup.hasData).toBe(false)
  })
})
