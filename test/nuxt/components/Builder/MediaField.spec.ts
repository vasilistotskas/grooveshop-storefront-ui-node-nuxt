import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { UApp } from '#components'
import BuilderMediaField from '~/components/Builder/MediaField.vue'
import { failWith } from '~~/test/helpers/api'
import { makeAsset } from '~~/test/fixtures/media'

/**
 * The control of an image setting (`builderField.ref('media', ...)`): it shows
 * the image the setting holds with its name, opens the library to choose
 * another, and clears the setting when it may be left empty. The setting holds
 * the asset id and nothing else.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const ONE = '/api/builder/media/4'
const LIBRARY = '/api/builder/media'

const hero = makeAsset({ id: 4, path: 'https://assets.example.test/hero.jpg' })
const banner = makeAsset({ id: 8, path: 'https://assets.example.test/banner.png' })

beforeEach(() => {
  api.routes({
    [ONE]: hero,
    [LIBRARY]: { count: 2, results: [hero, banner] },
  })
})

async function mount(value: unknown, clearable = true) {
  const updates: Array<number | undefined> = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderMediaField, {
        value,
        label: 'Εικόνα',
        clearable,
        disabled: false,
        onUpdate: (next: number | undefined) => updates.push(next),
      }),
    }),
  }), { attachTo: document.body })
  await flushPromises()
  return { wrapper, updates }
}

const button = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === name || node.textContent?.trim() === name)

describe('BuilderMediaField', () => {
  it('names the image the setting holds by its file, asked of the library by its id', async () => {
    const { wrapper } = await mount(4)

    expect(wrapper.text()).toContain('hero.jpg')
    expect(api.callsTo(ONE)).toHaveLength(1)
  })

  it('asks the library nothing while no image is chosen, and offers to choose one', async () => {
    const { wrapper } = await mount(undefined)

    expect(api.callsTo(ONE)).toHaveLength(0)
    expect(wrapper.text()).toContain('Επιλογή εικόνας')
    expect(wrapper.text()).not.toContain('Αφαίρεση')
  })

  it('says when the library no longer has the image, and still lets it be changed or cleared', async () => {
    api.routes({ [ONE]: failWith(404, { detail: 'Not found.' }) })

    const { wrapper } = await mount(4)

    expect(wrapper.text()).toContain('Δεν είναι πια διαθέσιμη· η ενότητα εμφανίζεται χωρίς εικόνα.')
    expect(wrapper.text()).toContain('Εικόνα #4')
    expect(wrapper.text()).toContain('Αλλαγή εικόνας')
    expect(wrapper.text()).toContain('Αφαίρεση')
  })

  it('clears the setting, with a control named after it', async () => {
    const { updates } = await mount(4)

    button('Αφαίρεση εικόνας: Εικόνα')!.click()
    await flushPromises()

    expect(updates).toEqual([undefined])
  })

  it('offers no way to clear a setting that must hold an image', async () => {
    const { wrapper } = await mount(4, false)

    expect(wrapper.text()).not.toContain('Αφαίρεση')
  })

  it('opens the library and puts the id of the image chosen into the setting', async () => {
    const { updates } = await mount(4)

    button('Αλλαγή εικόνας: Εικόνα')!.click()
    await flushPromises()
    await vi.waitFor(() => expect(button('banner.png')).not.toBeUndefined())
    button('banner.png')!.click()
    await flushPromises()
    button('Χρήση αυτής της εικόνας')!.click()
    await flushPromises()

    expect(updates).toEqual([8])
  })
})
