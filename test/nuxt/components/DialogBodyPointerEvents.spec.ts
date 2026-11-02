import { describe, it, expect, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { UDrawer, UModal, UPopover, USlideover } from '#components'

/**
 * An open dialog leaves `<body>`'s pointer events alone.
 *
 * reka-ui wrote `pointer-events: none` on `<body>` for a modal dialog from
 * two places, the content's dismissable layer and the overlay's scroll
 * lock. Every element inherits the property, so each open restyled the
 * whole page inside the tap (2026-11-01). The project's reka-ui patch
 * (`patches/reka-ui@2.11.0.patch`) stops both for dialogs, whose overlay
 * already catches a tap outside. A modal popover has no overlay and still
 * relies on the write, so it keeps it: that control also shows the
 * assertion is not vacuous.
 */
const DIALOGS = { UModal, USlideover, UDrawer }
const NAMES = Object.keys(DIALOGS) as (keyof typeof DIALOGS)[]

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.style.pointerEvents = ''
})

async function mountOpen(render: () => ReturnType<typeof h>) {
  wrapper = await mountSuspended(defineComponent({ setup: () => render }), { attachTo: document.body })
  await flushPromises()
  await nextTick()
}

describe('body pointer events', () => {
  it.each(NAMES)('stay untouched while a %s is open', async (name) => {
    await mountOpen(() => h(DIALOGS[name], { open: true, title: 'Dialog', description: 'Dialog' }, { body: () => h('p', 'body') }))

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.style.pointerEvents).toBe('')
    // The scroll lock itself still holds.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('are still turned off by a modal popover, which has no overlay', async () => {
    await mountOpen(() => h(UPopover, { open: true, modal: true }, {
      default: () => h('button', 'trigger'),
      content: () => h('p', 'popover'),
    }))

    expect(document.body.style.pointerEvents).toBe('none')
  })
})
