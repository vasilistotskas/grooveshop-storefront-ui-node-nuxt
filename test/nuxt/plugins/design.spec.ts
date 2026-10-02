import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UChip } from '#components'
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
