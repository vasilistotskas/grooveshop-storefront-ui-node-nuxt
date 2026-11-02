import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderRecordPicker from '~/components/Builder/RecordPicker.vue'
import type { BuilderLinkRef } from '~~/shared/types/builder'

/**
 * The record picker of a link or a record setting: it names the record
 * chosen (Django's link labels) and finds others as the staff member types
 * (Django's link search), grouped by kind.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const SEARCH = '/api/builder/link-search'
const LABELS = '/api/builder/link-labels'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  api.routes({
    [LABELS]: { product: { 42: { label: 'Φορτιστής 20W', active: true } }, category: { 7: { label: 'Καλώδια', active: false } } },
    [SEARCH]: {
      results: [
        { kind: 'product', id: 12, label: 'Καλώδιο USB-C', slug: 'kalodio-usb-c', active: true },
        { kind: 'category', id: 7, label: 'Καλώδια', slug: 'kalodia', active: true },
      ],
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
})

async function mount(value: BuilderLinkRef | undefined, kinds: readonly LinkRefKind[] = ['product', 'category']) {
  const updates: Array<BuilderLinkRef | undefined> = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderRecordPicker, {
        kinds,
        value,
        label: 'Προϊόν της διαφάνειας',
        clearable: true,
        disabled: false,
        onUpdate: (next: BuilderLinkRef | undefined) => updates.push(next),
      }),
    }),
  }), { attachTo: document.body })
  await flushPromises()
  return { wrapper, updates }
}

const trigger = (wrapper: Awaited<ReturnType<typeof mount>>['wrapper']) => wrapper.get('[aria-label="Προϊόν της διαφάνειας"]')

/** Opens the menu and types into its search field, past the picker's delay. */
async function search(wrapper: Awaited<ReturnType<typeof mount>>['wrapper'], term: string) {
  await trigger(wrapper).trigger('click')
  await flushPromises()
  const input = document.querySelector<HTMLInputElement>('input[placeholder="Αναζήτηση με όνομα ή διεύθυνση"]')!
  input.value = term
  input.dispatchEvent(new Event('input'))
  await vi.advanceTimersByTimeAsync(BUILDER_LINK_SEARCH_DELAY_MS)
  await flushPromises()
}

describe('BuilderRecordPicker', () => {
  it('names the record chosen by its name, asked of the store', async () => {
    const { wrapper } = await mount({ kind: 'product', id: 42 })

    expect(trigger(wrapper).text()).toContain('Φορτιστής 20W')
    expect(api.callsTo(LABELS)[0]!.options.query).toEqual({ product: '42' })
    expect(wrapper.text()).not.toContain('Δεν είναι πια διαθέσιμο')
  })

  it('says when the record chosen can no longer be linked', async () => {
    const { wrapper } = await mount({ kind: 'category', id: 7 })

    expect(wrapper.text()).toContain('Δεν είναι πια διαθέσιμο· θα παραλειφθεί στη δημοσίευση.')
  })

  it('asks nothing until something is typed, then searches its kinds once the typing stops', async () => {
    const { wrapper } = await mount(undefined)

    expect(api.callsTo(LABELS)).toHaveLength(0)
    await search(wrapper, 'καλ')

    const calls = api.callsTo(SEARCH)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.options.query).toEqual({ q: 'καλ', kinds: 'product,category' })
  })

  it('lists what it found under each kind, and picks one as a link stores it', async () => {
    const { wrapper, updates } = await mount(undefined)
    await search(wrapper, 'καλ')

    const listed = [...document.querySelectorAll('[role="listbox"] [role="option"], [role="listbox"] [role="group"] > :first-child')]
      .map(node => node.textContent?.trim())
    expect(listed).toEqual(expect.arrayContaining(['Προϊόντα', 'Κατηγορίες']))
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes('Καλώδιο USB-C'))!
    option.click()
    await flushPromises()

    expect(updates).toEqual([{ kind: 'product', id: 12 }])
  })
})
