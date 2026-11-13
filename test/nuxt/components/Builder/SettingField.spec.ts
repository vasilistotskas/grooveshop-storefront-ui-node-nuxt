import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import * as z from 'zod'
import { UApp } from '#components'
import BuilderSettingField from '~/components/Builder/SettingField.vue'
import { defineBlock } from '~~/shared/builder/defineBlock'
import { builderField } from '~~/shared/builder/fields'
import { BUILDER_ICONS } from '~~/shared/builder/icons'
import labels from '~~/app/builder/labels/el.json'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import postsGrid from '~/blocks/blog_posts_grid.block'
import footerColumn from '~/blocks/footer_column.block'
import type { BlockDefinition } from '~~/shared/types/builder'
import { makeAsset } from '~~/test/fixtures/media'

/**
 * The image setting of the settings form: a block that declares a `media`
 * ref (no real block does yet) gets the library control, and the id it holds
 * is what the form stores. And the icon setting: a choice from the builder's
 * list, never free text.
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

/** The field's own copy (el): its "section's own default" choice. */
const fieldLabels = inlineCopy('app/components/Builder/SettingField.vue')

const iconTile = defineBlock({
  type: 'icon_tile',
  version: 1,
  kinds: ['section'],
  schema: z.object({ icon: builderField.icon().optional() }),
})

async function mount(settings: Record<string, unknown>, block: BlockDefinition = photoBand, path?: string) {
  const fields = builderSettingsFields(block)
  const field = path === undefined ? fields[0] : fields.find(candidate => candidate.path === path)
  const updates: Array<[string, unknown]> = []
  const wrapper = await mountSuspended(defineComponent({
    render: () => h(UApp, null, {
      default: () => h(BuilderSettingField, {
        blockType: block.type,
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

describe('BuilderSettingField, an icon setting', () => {
  it('offers the builder’s icons by name, each drawn beside it, and no text field', async () => {
    const { wrapper } = await mount({ icon: 'i-lucide-shield' }, iconTile)

    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
    const trigger = wrapper.get('button[role="combobox"]')
    expect(trigger.text()).toBe(labels.options.icon['i-lucide-shield'])
    expect(trigger.find('.iconify').classes()).toContain('i-lucide:shield')

    await trigger.trigger('click')
    await flushPromises()
    const options = [...document.body.querySelectorAll('[role="option"]')]
    // The section's own default (no icon) first, then every icon of the list.
    expect(options).toHaveLength(BUILDER_ICONS.length + 1)
  })

  it('stores the icon picked, and clears it when the section’s own default is picked', async () => {
    const { wrapper, updates } = await mount({ icon: 'i-lucide-shield' }, iconTile)
    const pick = async (name: string) => {
      await wrapper.get('button[role="combobox"]').trigger('click')
      await flushPromises()
      const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(node => node.textContent?.trim() === name)
      expect(option, name).toBeInstanceOf(HTMLElement)
      // Reka selects an item on pointer-up, as a pointer does.
      option?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
      await flushPromises()
    }

    await pick(labels.options.icon['i-heroicons-truck'])
    await pick(fieldLabels.default)

    expect(updates).toEqual([['icon', 'i-heroicons-truck'], ['icon', undefined]])
  })
})

/**
 * A help line follows the block, not the setting's name: the posts band's
 * icon line is its own, and a footer column's icon field shows none
 * (2026-11-13: it showed the posts band's).
 */
describe('BuilderSettingField, a help line', () => {
  it.each([
    ['the posts band', postsGrid, labels.blocks.blog_posts_grid.settings.icon.help],
    ['a footer column', footerColumn, undefined],
  ])('on %s’s icon field is its own', async (_case, block, help) => {
    const { wrapper } = await mount({}, block, 'icon')

    const shown = wrapper.find('[data-slot="help"]')
    expect(shown.exists() ? shown.text() : undefined).toBe(help)
  })
})
