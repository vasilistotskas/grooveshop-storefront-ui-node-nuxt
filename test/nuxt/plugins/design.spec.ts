import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UButton, UChip, UModal } from '#components'
import designPlugin from '~/plugins/design'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

/**
 * Every store is drawn in Groove Volt except webside, whose frozen tree
 * must keep rendering with the app config and stylesheet it was
 * captured against.
 */
const run = () => (designPlugin as unknown as () => void)()

const theme = () => useAppConfig().ui as unknown as Record<string, unknown>

describe('design plugin', () => {
  let snapshot: Record<string, unknown>

  beforeEach(() => {
    // A JSON round-trip, not structuredClone: on the client the app
    // config is a reactive proxy, which structuredClone refuses.
    snapshot = JSON.parse(JSON.stringify(toRaw(theme())))
  })

  afterEach(() => {
    // The overlay only writes keys the base config has or adds new
    // component entries, so restoring is assigning the snapshot back and
    // dropping what it added.
    const ui = theme()
    const added = Object.keys(ui).filter(key => !(key in snapshot))
    for (const key of added) Reflect.deleteProperty(ui, key)
    Object.assign(ui, snapshot)
    useState('tenant').value = null
  })

  it('lays the Volt component theme over the app config for a store', () => {
    useState('tenant').value = validTenantConfig('demo.example', { schemaName: 'demo' })

    run()

    const button = theme().button as { slots: { base: string } }
    expect(button.slots.base).toContain(VOLT_UI.button.slots.base)
    // The base config's own classes survive underneath the overlay.
    expect(button.slots.base).toContain('tap-press')
  })

  it('reaches a rendered component through a variant both configs size', async () => {
    // `app.config.ts` and Volt both write the chip's `3xl` size. Merged
    // into an array, tailwind-variants read it as a per-slot map and the
    // chip rendered with no size at all.
    useState('tenant').value = validTenantConfig('demo.example', { schemaName: 'demo' })
    run()

    const wrapper = await mountSuspended(UChip, { props: { size: '3xl', text: 1 } })

    const classes = wrapper.find('[data-slot="base"]').attributes('class')?.split(' ') ?? []
    expect(classes).toEqual(expect.arrayContaining(['h-4.5', 'min-w-4.5']))
    expect(classes).not.toContain('h-[16px]')
  })

  it('sizes a button by a minimum height, so content it wraps is never cropped', async () => {
    // The product gallery's image buttons wrap a square picture. A fixed
    // `h-11` cropped every one of them to 44px; the board's label buttons
    // are 44px either way. jsdom has no layout, so the class is the
    // contract.
    useState('tenant').value = validTenantConfig('demo.example', { schemaName: 'demo' })
    run()

    const wrapper = await mountSuspended(UButton, { props: { size: 'md' }, slots: { default: () => 'Image' } })

    const classes = wrapper.find('[data-slot="base"]').attributes('class')?.split(' ') ?? []
    expect(classes).toContain('min-h-11')
    expect(classes.filter(name => /^h-/.test(name))).toEqual([])
  })

  it('dims the page behind a modal with the scrim, through the overlay variant', async () => {
    // The base theme sets a modal's overlay colour in a VARIANT
    // (`overlay: true`), which lands after the slot classes: an overlay
    // written as a slot class would lose to the light wash.
    useState('tenant').value = validTenantConfig('demo.example', { schemaName: 'demo' })
    run()

    await mountSuspended(UModal, { props: { open: true, title: 'Prefs' } })

    const overlay = document.body.querySelector('[data-slot="overlay"]')?.getAttribute('class')?.split(' ') ?? []
    expect(overlay).toContain('bg-(--ui-scrim)')
    expect(overlay).not.toContain('bg-elevated/75')
  })

  it('leaves webside on the base app config', () => {
    useState('tenant').value = validTenantConfig('webside.gr', { schemaName: 'webside' })

    run()

    expect(theme()).toEqual(snapshot)
  })

  it('applies nothing without a tenant', () => {
    useState('tenant').value = null

    run()

    expect(theme()).toEqual(snapshot)
  })
})
