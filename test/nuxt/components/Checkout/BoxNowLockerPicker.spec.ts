/**
 * Tests for Checkout/BoxNowLockerPicker.vue component.
 *
 * The picker renders a fullscreen UModal containing a BoxNow widget
 * iframe and listens for postMessage events to capture the selected locker.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BoxNowLockerPicker from '~/components/Checkout/BoxNowLockerPicker.vue'

// partnerId is now passed as a prop, no useRuntimeConfig mock needed.

// ---------------------------------------------------------------------------
// Valid locker payload (mirrors what the BoxNow widget emits)
// ---------------------------------------------------------------------------

const VALID_LOCKER_PAYLOAD = {
  boxnowLockerId: '4',
  boxnowLockerPostalCode: '15234',
  boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
  boxnowLockerName: 'Χαλάνδρι ΟΠΑΠ Play',
}

// ---------------------------------------------------------------------------
// Helper to dispatch a MessageEvent on window (simulates widget postMessage)
// ---------------------------------------------------------------------------

function dispatchBoxNowMessage(origin: string, data: unknown) {
  window.dispatchEvent(
    new MessageEvent('message', { origin, data }),
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Checkout/BoxNowLockerPicker', () => {
  describe('modal and iframe rendering (open=true)', () => {
    it('mounts successfully', async () => {
      const wrapper = await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      expect(wrapper.exists()).toBe(true)
    })

    // UModal teleports its body to a portal at document.body — the
    // iframe lives outside `wrapper`'s rendered tree, so we have to
    // query `document` directly rather than `wrapper.find()`.
    it('renders an iframe with a src matching the BoxNow widget URL pattern when open=true', async () => {
      await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      const iframe = document.querySelector('iframe')
      expect(iframe).not.toBeNull()

      const src = iframe!.getAttribute('src') ?? ''
      expect(src).toMatch(/^https:\/\/widget-v5\.boxnow\.gr\/iframe\.html/)
      expect(src).toContain('partnerId=10391')
    })

    it('iframe has allow="geolocation" attribute', async () => {
      await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      const iframe = document.querySelector('iframe')
      expect(iframe?.getAttribute('allow')).toBe('geolocation')
    })

    it('iframe src contains expected default params (gps=yes, autoselect=yes, autoclose=no)', async () => {
      await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      const src = document.querySelector('iframe')?.getAttribute('src') ?? ''
      expect(src).toContain('gps=yes')
      expect(src).toContain('autoselect=yes')
      expect(src).toContain('autoclose=no')
      expect(src).toContain('language=el')
    })
  })

  describe('postMessage handling', () => {
    it('emits "selected" with parsed locker when a valid postMessage arrives from an allowed origin', async () => {
      const wrapper = await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      dispatchBoxNowMessage('https://widget-v5.boxnow.gr', VALID_LOCKER_PAYLOAD)
      await wrapper.vm.$nextTick()

      const selectedEvents = wrapper.emitted('selected')
      expect(selectedEvents).toBeTruthy()
      expect(selectedEvents!.length).toBeGreaterThanOrEqual(1)

      const emittedLocker = selectedEvents![0]![0] as Record<string, string>
      expect(emittedLocker.boxnowLockerId).toBe('4')
      expect(emittedLocker.boxnowLockerPostalCode).toBe('15234')
      expect(emittedLocker.boxnowLockerAddressLine1).toBe('Λεωφ. Πεντέλης 125')
    })

    it('does NOT emit "selected" for a postMessage from an untrusted origin', async () => {
      const wrapper = await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      dispatchBoxNowMessage('https://attacker.com', VALID_LOCKER_PAYLOAD)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('selected')).toBeFalsy()
    })

    it('does NOT emit "selected" for a valid origin but invalid (missing required fields) payload', async () => {
      const wrapper = await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      // Missing boxnowLockerPostalCode and boxnowLockerAddressLine1
      dispatchBoxNowMessage('https://widget-v5.boxnow.gr', {
        boxnowLockerId: '4',
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('selected')).toBeFalsy()
    })

    it('does NOT emit "selected" for a postMessage from an HTTP (not HTTPS) origin', async () => {
      const wrapper = await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      dispatchBoxNowMessage('http://widget-v5.boxnow.gr', VALID_LOCKER_PAYLOAD)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('selected')).toBeFalsy()
    })

    it('does NOT emit "selected" when payload is a string (non-object)', async () => {
      const wrapper = await mountSuspended(BoxNowLockerPicker, {
        props: { open: true, partnerId: '10391' },
      })

      dispatchBoxNowMessage('https://widget-v5.boxnow.gr', 'some-string-payload')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('selected')).toBeFalsy()
    })
  })
})
