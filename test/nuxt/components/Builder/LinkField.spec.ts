import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderLinkField from '~/components/Builder/LinkField.vue'

/**
 * A link setting: no link, a store page, an external address, or a record
 * of the store chosen with the record picker.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

beforeEach(() => {
  api.routes({ '/api/builder/link-labels': { product: { 42: { label: 'Φορτιστής 20W', active: true } } } })
})

async function mount(value: unknown, disabled = false) {
  const updates: unknown[] = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderLinkField, { label: 'Σύνδεσμος κουμπιού', value, disabled, onUpdate: (next: unknown) => updates.push(next) }),
    }),
  }))
  await flushPromises()
  return { wrapper, updates }
}

const named = (wrapper: Awaited<ReturnType<typeof mount>>['wrapper'], name: string) => wrapper.get(`[aria-label="${name}"]`)

describe('BuilderLinkField', () => {
  it('names a store page by its name', async () => {
    const { wrapper } = await mount({ route: '/products' })

    expect(named(wrapper, 'Πού οδηγεί: Σύνδεσμος κουμπιού').text()).toContain('Σελίδα του καταστήματος')
    expect(named(wrapper, 'Σελίδα του καταστήματος: Σύνδεσμος κουμπιού').text()).toContain('Προϊόντα')
  })

  it('saves an external address only once one is typed', async () => {
    const { wrapper, updates } = await mount({ href: 'https://example.com' })
    const input = named(wrapper, 'Εξωτερική διεύθυνση: Σύνδεσμος κουμπιού')

    await input.setValue('  https://shop.example  ')
    await input.setValue('   ')

    expect(updates).toEqual([{ href: 'https://shop.example' }, undefined])
  })

  it('names the record a link points at, in a picker of every kind a link may name', async () => {
    const { wrapper } = await mount({ ref: { kind: 'product', id: 42 } })

    expect(named(wrapper, 'Πού οδηγεί: Σύνδεσμος κουμπιού').text()).toContain('Προϊόν, κατηγορία, άρθρο ή σελίδα')
    expect(named(wrapper, 'Εγγραφή: Σύνδεσμος κουμπιού').text()).toContain('Φορτιστής 20W')
  })

  it('saves no link while a record is still to be picked', async () => {
    const { wrapper, updates } = await mount(undefined)

    await named(wrapper, 'Πού οδηγεί: Σύνδεσμος κουμπιού').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    ;[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.includes('Προϊόν, κατηγορία'))!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    expect(updates).toEqual([undefined])
    expect(wrapper.find('[aria-label="Εγγραφή: Σύνδεσμος κουμπιού"]').exists()).toBe(true)
  })

  it('lets nothing change when disabled', async () => {
    const { wrapper } = await mount({ href: 'https://example.com' }, true)

    expect(named(wrapper, 'Εξωτερική διεύθυνση: Σύνδεσμος κουμπιού').attributes('disabled')).toBeDefined()
  })
})
