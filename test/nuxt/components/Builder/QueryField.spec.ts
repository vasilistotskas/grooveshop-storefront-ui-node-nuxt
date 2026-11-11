import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp, UInputNumber, USelect } from '#components'
import BuilderQueryField from '~/components/Builder/QueryField.vue'
import BuilderRecordList from '~/components/Builder/RecordList.vue'
import BuilderRecordPicker from '~/components/Builder/RecordPicker.vue'
import type { BuilderQueryDescriptor } from '~/utils/builderQuery'

/**
 * The control of a list setting (`builderField.query`): how the merchant says
 * what a rail lists. Every change is the WHOLE descriptor, which is closed,
 * so a key the merchant clears is a key the list no longer has.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const LABELS = '/api/builder/link-labels'

beforeEach(() => {
  api.routes({
    [LABELS]: {
      product: { 3: { label: 'Φορτιστής', active: true }, 1: { label: 'Καλώδιο', active: false } },
      category: { 4: { label: 'Αξεσουάρ', active: true } },
    },
  })
})

type Field = InstanceType<typeof BuilderQueryField>['$props']['field']

const productField: Field = { kind: 'query', path: 'products', pointer: '/products', required: true, source: 'product', maxLimit: 12 }

async function mount(field: Field, value: unknown, disabled = false) {
  const updates: BuilderQueryDescriptor[] = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderQueryField, { field, value, label: 'Προϊόντα', disabled, onUpdate: (next: BuilderQueryDescriptor) => updates.push(next) }),
    }),
  }), { attachTo: document.body })
  await flushPromises()
  return { wrapper, updates }
}

/** The radio of the item named `name`: an item holds its radio and its label. */
const radio = (wrapper: Awaited<ReturnType<typeof mount>>['wrapper'], name: string) =>
  wrapper.findAll('[data-slot="item"]').find(item => item.text().trim() === name)!.get('[role="radio"]')

describe('BuilderQueryField', () => {
  it('offers the ways a source can be listed, and says so while nothing is chosen', async () => {
    const { wrapper } = await mount(productField, undefined)

    expect(wrapper.findAll('[role="radio"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Με κανόνα')
    expect(wrapper.text()).toContain('Επιλεγμένα')
    expect(wrapper.text()).toContain('Επιλέξτε πώς θα βρίσκονται τα στοιχεία.')
  })

  it('starts a rule with the newest, as many as the setting allows up to the default', async () => {
    const { wrapper, updates } = await mount(productField, undefined)

    await radio(wrapper, 'Με κανόνα').trigger('click')

    expect(updates).toEqual([{ mode: 'filter', ordering: 'newest', limit: 8 }])
  })

  it('starts a hand-picked list empty, and changing the mode drops the rule keys', async () => {
    const { wrapper, updates } = await mount(productField, { mode: 'filter', categories: [4], ordering: 'topRated', limit: 6 })

    await radio(wrapper, 'Επιλεγμένα').trigger('click')

    expect(updates).toEqual([{ mode: 'picked', ids: [] }])
  })

  it('shows a rule: its categories by name, its order and how many', async () => {
    const { wrapper } = await mount(productField, { mode: 'filter', categories: [4], ordering: 'topRated', limit: 6 })

    expect(wrapper.text()).toContain('Αξεσουάρ')
    expect(wrapper.text()).toContain('Τα πιο καλά αξιολογημένα')
    expect(api.callsTo(LABELS)[0]!.options.query).toEqual({ category: '4' })
    expect(wrapper.findComponent(UInputNumber).props()).toMatchObject({ modelValue: 6, min: 1, max: 12 })
  })

  it('changes how many with the whole descriptor, and leaves the rest of it', async () => {
    const { wrapper, updates } = await mount(productField, { mode: 'filter', categories: [4], ordering: 'topRated', limit: 6 })

    wrapper.findComponent(UInputNumber).vm.$emit('update:modelValue', 10)

    expect(updates).toEqual([{ mode: 'filter', categories: [4], ordering: 'topRated', limit: 10 }])
  })

  it('writes the stock choice into a product rule, and takes the key out for "as they come"', async () => {
    const { wrapper, updates } = await mount(productField, { mode: 'filter', ordering: 'newest', limit: 6 })
    const select = wrapper.findAllComponents(USelect).find(item => item.props('modelValue') === 'any')!

    select.vm.$emit('update:modelValue', 'inStockFirst')
    expect(updates.at(-1)).toEqual({ mode: 'filter', ordering: 'newest', limit: 6, stock: 'inStockFirst' })

    const { wrapper: chosen, updates: back } = await mount(productField, { mode: 'filter', ordering: 'newest', stock: 'inStockOnly', limit: 6 })
    chosen.findAllComponents(USelect).find(item => item.props('modelValue') === 'inStockOnly')!.vm.$emit('update:modelValue', 'any')
    expect(back.at(-1)).toEqual({ mode: 'filter', ordering: 'newest', limit: 6 })
  })

  it('takes the categories key out of the rule when the last category is removed', async () => {
    const { wrapper, updates } = await mount(productField, { mode: 'filter', categories: [4], ordering: 'newest', limit: 6 })

    await wrapper.get('button[aria-label="Αφαίρεση: Αξεσουάρ"]').trigger('click')

    expect(updates).toEqual([{ mode: 'filter', ordering: 'newest', limit: 6 }])
  })

  it('lists a hand-picked list in the order of the merchant, names it, and warns about a record that is gone', async () => {
    const { wrapper } = await mount(productField, { mode: 'picked', ids: [3, 1] })

    const names = wrapper.findAll('li').map(item => item.text())
    expect(names[0]).toContain('Φορτιστής')
    expect(names[1]).toContain('Καλώδιο')
    expect(wrapper.find('[aria-label="Δεν είναι πια διαθέσιμο· θα παραλειφθεί στη δημοσίευση."]').exists()).toBe(true)
    expect(api.callsTo(LABELS)[0]!.options.query).toEqual({ product: '3,1' })
    expect(wrapper.findComponent(UInputNumber).exists()).toBe(false)
  })

  it('moves a hand-picked record down', async () => {
    const { wrapper, updates } = await mount(productField, { mode: 'picked', ids: [3, 1] })

    await wrapper.get('button[aria-label="Μετακίνηση κάτω: Φορτιστής"]').trigger('click')

    expect(updates).toEqual([{ mode: 'picked', ids: [1, 3] }])
  })

  it('adds the record the picker chose once', async () => {
    const { wrapper, updates } = await mount(productField, { mode: 'picked', ids: [3] })
    const picker = wrapper.findComponent(BuilderRecordPicker)

    picker.vm.$emit('update', { kind: 'product', id: 9 })
    picker.vm.$emit('update', { kind: 'product', id: 3 })

    expect(updates).toEqual([{ mode: 'picked', ids: [3, 9] }])
  })

  it('does not offer the picker once the list is full', async () => {
    const ids = Array.from({ length: 24 }, (_, index) => index + 1)
    const { wrapper } = await mount(productField, { mode: 'picked', ids })

    expect(wrapper.findComponent(BuilderRecordList).props('max')).toBe(24)
    expect(wrapper.findComponent(BuilderRecordPicker).props('disabled')).toBe(true)
    expect(wrapper.text()).toContain('Έχετε φτάσει το όριο των 24.')
  })

  it('writes a blog rule with a featured filter', async () => {
    const field: Field = { kind: 'query', path: 'posts', pointer: '/posts', required: false, source: 'blogPost', maxLimit: 24 }
    const { wrapper, updates } = await mount(field, { mode: 'filter', ordering: 'newest', limit: 3 })

    await radio(wrapper, 'Μόνο προτεινόμενα').trigger('click')

    expect(updates).toEqual([{ mode: 'filter', ordering: 'newest', limit: 3, featured: true }])
  })

  it('lists the children of a category only once the parent is chosen', async () => {
    const field: Field = { kind: 'query', path: 'categories', pointer: '/categories', required: true, source: 'category', maxLimit: 24 }
    const { wrapper, updates } = await mount(field, { mode: 'children', limit: 8 })

    wrapper.findComponent(BuilderRecordPicker).vm.$emit('update', { kind: 'category', id: 4 })

    expect(updates).toEqual([{ mode: 'children', limit: 8, parent: 4 }])
  })

  it('is only a limit for a source with a single way to list it, even before it is set', async () => {
    const field: Field = { kind: 'query', path: 'offers', pointer: '/offers', required: true, source: 'promotion', maxLimit: 3 }
    const { wrapper, updates } = await mount(field, undefined)

    expect(wrapper.findAll('[role="radio"]')).toHaveLength(0)
    wrapper.findComponent(UInputNumber).vm.$emit('update:modelValue', 2)

    expect(updates).toEqual([{ limit: 2 }])
  })
})
