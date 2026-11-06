import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import * as z from 'zod'
import { UApp } from '#components'
import BuilderSettingField from '~/components/Builder/SettingField.vue'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'
import { makeAsset } from '~~/test/fixtures/media'

/**
 * Only the image setting of the settings form is covered here: a block that
 * declares a `media` ref (no real block does yet) gets the library control,
 * and the id it holds is what the form stores.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const photoBand = defineBlock({
  type: 'photo_band',
  version: 1,
  kinds: ['section'],
  schema: z.object({ image: builderField.ref('media', { onMissing: 'empty' }).optional() }),
})

beforeEach(() => {
  api.routes({ '/api/builder/media/4': makeAsset({ id: 4, path: 'https://assets.example.test/hero.jpg' }) })
})

async function mount(settings: Record<string, unknown>) {
  const [field] = builderSettingsFields(photoBand)
  const updates: Array<[string, unknown]> = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderSettingField, {
        field: field!,
        settings,
        errors: new Map(),
        disabled: false,
        onUpdate: (path: string, value: unknown) => updates.push([path, value]),
      }),
    }),
  }), { attachTo: document.body })
  await flushPromises()
  return { wrapper, updates }
}

describe('BuilderSettingField, an image setting', () => {
  it('draws the library control with the image it holds, not a number field', async () => {
    const { wrapper } = await mount({ image: 4 })

    expect(wrapper.text()).toContain('hero.jpg')
    expect(wrapper.find('input[type="number"]').exists()).toBe(false)
  })

  it('takes the image out of the settings when it is cleared', async () => {
    const { wrapper, updates } = await mount({ image: 4 })

    const clear = wrapper.findAll('button').find(node => node.text() === 'Αφαίρεση')!
    await clear.trigger('click')

    expect(updates).toEqual([['image', undefined]])
  })
})
