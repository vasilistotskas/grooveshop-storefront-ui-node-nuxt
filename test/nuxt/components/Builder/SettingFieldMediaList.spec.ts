import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, ref } from 'vue'
import * as z from 'zod'
import { UApp } from '#components'
import BuilderSettingField from '~/components/Builder/SettingField.vue'
import { builderSettingsFields } from '~/utils/builderSettingsFields'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'
import { makeAsset } from '~~/test/fixtures/media'

/**
 * A list of images (`z.array(builderField.ref('media', ...))`) in the settings
 * form: one library control per entry, named by its position because the
 * desk and phone lists pair by position, and the list stored as ids, in order.
 * The real field, picker and form are mounted; only the API is faked.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const LIBRARY = '/api/builder/media'
const MAX = 3

const gallery = defineBlock({
  type: 'photo_strip',
  version: 1,
  kinds: ['section'],
  schema: z.object({ artworks: z.array(builderField.ref('media', { onMissing: 'empty' })).max(MAX).optional() }),
})

const hero = makeAsset({ id: 4, path: 'https://assets.example.test/hero.jpg' })
const banner = makeAsset({ id: 8, path: 'https://assets.example.test/banner.png' })
const poster = makeAsset({ id: 9, path: 'https://assets.example.test/poster.webp' })
const library = [hero, banner, poster]

beforeEach(() => {
  api.routes({
    [`${LIBRARY}/4`]: hero,
    [`${LIBRARY}/8`]: banner,
    [`${LIBRARY}/9`]: poster,
    [LIBRARY]: { count: library.length, results: library },
  })
})

async function mount(settings: Record<string, unknown>) {
  const [field] = builderSettingsFields(gallery)
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

const control = (name: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === name || node.textContent?.trim() === name)

/** Chooses `file` in the library the open picker shows. */
async function choose(file: string) {
  await vi.waitFor(() => expect(control(file)).not.toBeUndefined())
  control(file)!.click()
  await flushPromises()
  control('Χρήση αυτής της εικόνας')!.click()
  await flushPromises()
}

describe('BuilderSettingField, a list of images', () => {
  it('is a field of its own kind, recognised by the `*` data pointer and not by any block', () => {
    expect(builderSettingsFields(gallery)).toEqual([
      { kind: 'mediaList', path: 'artworks', pointer: '/artworks', required: false, maxItems: MAX },
    ])
  })

  it('draws a control per image, named by its position, and one more to add', async () => {
    const { wrapper } = await mount({ artworks: [4, 8] })

    expect(wrapper.text()).toContain('hero.jpg')
    expect(wrapper.text()).toContain('banner.png')
    expect(control('Αλλαγή εικόνας: Εικόνες, 1')).not.toBeUndefined()
    expect(control('Αλλαγή εικόνας: Εικόνες, 2')).not.toBeUndefined()
    expect(control('Επιλογή εικόνας: Εικόνες, 3')).not.toBeUndefined()
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('asks the library for nothing while every picker is closed, and once for the picker that opens', async () => {
    await mount({ artworks: [4, 8] })
    expect(api.callsTo(LIBRARY)).toHaveLength(0)

    control('Αλλαγή εικόνας: Εικόνες, 2')!.click()
    await flushPromises()
    await vi.waitFor(() => expect(control('poster.webp')).not.toBeUndefined())

    expect(api.callsTo(LIBRARY)).toHaveLength(1)
  })

  it('adds the image chosen as the last entry, as a number', async () => {
    const { updates } = await mount({ artworks: [4, 8] })

    control('Επιλογή εικόνας: Εικόνες, 3')!.click()
    await flushPromises()
    await choose('poster.webp')

    expect(updates).toEqual([['artworks', [4, 8, 9]]])
  })

  it('adds the first image to a list that is not there yet', async () => {
    const { updates } = await mount({})

    control('Επιλογή εικόνας: Εικόνες, 1')!.click()
    await flushPromises()
    await choose('hero.jpg')

    expect(updates).toEqual([['artworks', [4]]])
  })

  it('replaces the image at its place and keeps the others where they are', async () => {
    const { updates } = await mount({ artworks: [4, 8, 4] })

    control('Αλλαγή εικόνας: Εικόνες, 2')!.click()
    await flushPromises()
    await choose('poster.webp')

    expect(updates).toEqual([['artworks', [4, 9, 4]]])
  })

  it('removes the entry at its place', async () => {
    const { updates } = await mount({ artworks: [4, 8, 9] })

    control('Αφαίρεση: 2')!.click()
    await flushPromises()

    expect(updates).toEqual([['artworks', [4, 9]]])
  })

  it('moves an entry down and up, and cannot move the first up or the last down', async () => {
    const { updates } = await mount({ artworks: [4, 8, 9] })

    expect(control('Μετακίνηση πάνω: 1')!.disabled).toBe(true)
    expect(control('Μετακίνηση κάτω: 3')!.disabled).toBe(true)
    control('Μετακίνηση κάτω: 1')!.click()
    control('Μετακίνηση πάνω: 3')!.click()
    await flushPromises()

    expect(updates).toEqual([['artworks', [8, 4, 9]], ['artworks', [4, 9, 8]]])
  })

  it('stops at the most the schema allows, with no way to add another', async () => {
    const { wrapper } = await mount({ artworks: [4, 8, 9] })

    expect(wrapper.findAll('button').filter(node => node.attributes('aria-label')?.startsWith('Επιλογή εικόνας'))).toHaveLength(0)
    expect(control('Αλλαγή εικόνας: Εικόνες, 3')).not.toBeUndefined()
  })

  it('keeps a row that moves, and gives an image listed twice a row each', async () => {
    const [field] = builderSettingsFields(gallery)
    const settings = ref<Record<string, unknown>>({ artworks: [4, 8, 4] })
    const wrapper = await mountSuspended(defineComponent({
      render: () => h(UApp, null, {
        default: () => h(BuilderSettingField, { field: field!, settings: settings.value, errors: new Map(), disabled: false }),
      }),
    }), { attachTo: document.body })
    await flushPromises()

    expect(wrapper.text().match(/hero\.jpg/g)).toHaveLength(2)
    expect(api.callsTo(`${LIBRARY}/4`)).toHaveLength(2)
    expect(api.callsTo(`${LIBRARY}/8`)).toHaveLength(1)

    // The first image goes: the others move up one place, and none asks again.
    settings.value = { artworks: [8, 4] }
    await flushPromises()

    expect(api.callsTo(`${LIBRARY}/8`)).toHaveLength(1)
    expect(api.callsTo(`${LIBRARY}/4`)).toHaveLength(2)
    expect(wrapper.text()).toContain('banner.png')
    expect(wrapper.text().match(/hero\.jpg/g)).toHaveLength(1)
    expect(wrapper.text().indexOf('banner.png')).toBeLessThan(wrapper.text().indexOf('hero.jpg'))
  })

  it('takes out an entry whose image is deleted from the library, since a list holds no empty slot', async () => {
    const { updates } = await mount({ artworks: [4, 8, 9] })

    control('Αλλαγή εικόνας: Εικόνες, 2')!.click()
    await flushPromises()
    await vi.waitFor(() => expect(control('banner.png')).not.toBeUndefined())
    control('banner.png')!.click()
    await flushPromises()
    api.routes({ [LIBRARY]: { count: 2, results: [hero, poster] }, [`${LIBRARY}/8`]: null })
    control('Διαγραφή')!.click()
    await flushPromises()
    control('Επιβεβαίωση διαγραφής')!.click()
    await flushPromises()

    expect(updates).toEqual([['artworks', [4, 9]]])
  })
})
