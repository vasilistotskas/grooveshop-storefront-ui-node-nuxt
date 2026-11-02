import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderLinkField from '~/components/Builder/LinkField.vue'

/**
 * A link setting: no link, a store page, or an external address; a link to
 * a particular record keeps its place, read only, until the record picker.
 */
async function mount(value: unknown, disabled = false) {
  const updates: unknown[] = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderLinkField, { label: 'Σύνδεσμος κουμπιού', value, disabled, onUpdate: (next: unknown) => updates.push(next) }),
    }),
  }))
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

  it('keeps a link to a particular record, read only', async () => {
    const { wrapper } = await mount({ ref: { kind: 'product', id: 42 } })

    expect(wrapper.text()).toContain('Προϊόν #42')
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('lets nothing change when disabled', async () => {
    const { wrapper } = await mount({ href: 'https://example.com' }, true)

    expect(named(wrapper, 'Εξωτερική διεύθυνση: Σύνδεσμος κουμπιού').attributes('disabled')).toBeDefined()
  })
})
