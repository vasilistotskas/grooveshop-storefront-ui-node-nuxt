import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, ref } from 'vue'
import * as z from 'zod'
import { UApp, USelect } from '#components'
import BuilderSettingField from '~/components/Builder/SettingField.vue'
import { builderSettingsFields } from '~/utils/builderSettingsFields'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'

/**
 * A button's action in the settings form: its kind, and the one target of that
 * kind, read off the same schema the catalogue serves. Django refuses an action
 * with no target, so only a whole one is ever saved: choosing a kind asks for
 * its target and saves nothing half made. The real field is mounted; only the
 * API is faked.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const band = defineBlock({
  type: 'button_band',
  version: 1,
  kinds: ['section'],
  schema: z.object({
    label: builderField.text(100).optional(),
    ctaAction: builderField.action(['link', 'addToCart', 'addToWishlist', 'copyCode']).optional(),
  }),
  translatable: ['/label'],
})
const actionField = () => builderSettingsFields(band).find(({ path }) => path === 'ctaAction')!

/** What the spec reads of the kind's `USelect`, a generic component whose wrapper types its props as `never`. */
interface KindControl {
  items: { value: string }[]
  modelValue: string
  disabled?: boolean
}

async function mount(stored: Record<string, unknown>, options: { errors?: Map<string, string>, translation?: BuilderSettingsTranslation } = {}) {
  const settings = ref(stored)
  const updates: Array<[string, unknown]> = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderSettingField, {
        field: actionField(),
        settings: settings.value,
        errors: options.errors ?? new Map(),
        disabled: false,
        ...(options.translation && { translation: options.translation }),
        onUpdate: (path: string, value: unknown) => updates.push([path, value]),
      }),
    }),
  }), { attachTo: document.body })
  await flushPromises()
  const nested = () => wrapper.findAllComponents(BuilderSettingField).filter(child => child.props('field').path !== 'ctaAction')
  return {
    wrapper,
    settings,
    updates,
    target: () => nested()[0],
    kindControl: () => wrapper.findAllComponents(USelect)[0]!.props() as unknown as KindControl,
    chooseKind: async (kind: string) => {
      wrapper.findAllComponents(USelect)[0]!.vm.$emit('update:modelValue', kind)
      await flushPromises()
    },
  }
}

describe('a button\'s action in the settings form', () => {
  it('asks only for a kind while there is none, and offers no action at all', async () => {
    const { target, kindControl } = await mount({})

    expect(target()).toBeUndefined()
    expect(kindControl().items.map(item => item.value)).toEqual(['@none', 'link', 'addToCart', 'addToWishlist', 'copyCode'])
    expect(kindControl().modelValue).toBe('@none')
  })

  it.each([
    { kind: 'link', target: 'ctaAction.to', control: 'link' },
    { kind: 'addToCart', target: 'ctaAction.product', control: 'record' },
    { kind: 'addToWishlist', target: 'ctaAction.product', control: 'record' },
    { kind: 'copyCode', target: 'ctaAction.promotion', control: 'record' },
  ])('asks a $kind button for its $target and nothing else', async ({ kind, target: path, control }) => {
    const { target, kindControl } = await mount({ ctaAction: { kind } })

    expect(kindControl().modelValue).toBe(kind)
    expect(target()!.props('field')).toMatchObject({ path, kind: control })
  })

  it('saves nothing half made: choosing a kind only asks for its target', async () => {
    const { chooseKind, target, updates } = await mount({})

    await chooseKind('copyCode')

    expect(updates).toEqual([['ctaAction', undefined]])
    expect(target()!.props('field').path).toBe('ctaAction.promotion')
  })

  it('saves the whole action once it has its target', async () => {
    const { chooseKind, target, updates } = await mount({})
    await chooseKind('copyCode')
    updates.length = 0

    target()!.vm.$emit('update', 'ctaAction.promotion', 3)

    expect(updates).toEqual([['ctaAction', { kind: 'copyCode', promotion: 3 }]])
  })

  it('leaves no target behind when a new kind names another one', async () => {
    const { chooseKind, updates } = await mount({ ctaAction: { kind: 'addToCart', product: 5 } })

    await chooseKind('copyCode')

    expect(updates).toEqual([['ctaAction', undefined]])
  })

  it('keeps the product when a new kind acts on a product too', async () => {
    const { chooseKind, updates } = await mount({ ctaAction: { kind: 'addToCart', product: 5 } })

    await chooseKind('addToWishlist')

    expect(updates).toEqual([['ctaAction', { kind: 'addToWishlist', product: 5 }]])
  })

  it('takes the action out when its target is cleared, and keeps asking for one', async () => {
    const { target, updates, kindControl } = await mount({ ctaAction: { kind: 'addToCart', product: 5 } })

    target()!.vm.$emit('update', 'ctaAction.product', undefined)
    await flushPromises()

    expect(updates).toEqual([['ctaAction', undefined]])
    expect(kindControl().modelValue).toBe('addToCart')
  })

  it('takes the action out when no action is chosen', async () => {
    const { chooseKind, target, updates } = await mount({ ctaAction: { kind: 'addToCart', product: 5 } })

    await chooseKind('@none')

    expect(updates).toEqual([['ctaAction', undefined]])
    expect(target()).toBeUndefined()
  })

  it('follows the draft when it changes under the form, as an undo does', async () => {
    const { settings, kindControl } = await mount({ ctaAction: { kind: 'addToCart', product: 5 } })

    settings.value = { ctaAction: { kind: 'copyCode', promotion: 3 } }
    await flushPromises()

    expect(kindControl().modelValue).toBe('copyCode')
  })

  it('shows the draft\'s action in another language, and cannot change it', async () => {
    const { kindControl } = await mount({}, {
      translation: { fallback: { ctaAction: { kind: 'addToCart', product: 5 } }, translatable: new Set(['/label']) },
    })

    expect(kindControl().modelValue).toBe('addToCart')
    expect(kindControl().disabled).toBe(true)
  })

  it('says what Django refused about the action as a whole', async () => {
    const { wrapper } = await mount({ ctaAction: { kind: 'addToCart' } }, { errors: new Map([['ctaAction', 'Διαλέξτε προϊόν']]) })

    expect(wrapper.get('[role="alert"]').text()).toBe('Διαλέξτε προϊόν')
  })
})
