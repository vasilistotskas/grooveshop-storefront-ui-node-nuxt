import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import tenantThemePlugin from '~/plugins/tenant-theme'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

/**
 * A tenant's primary and neutral palettes replace Nuxt UI's, but only
 * with a colour Tailwind actually has: the values come from the
 * tenant row, and anything outside the allow-list is ignored rather
 * than written into the colour config every component reads.
 */
const run = () => (tenantThemePlugin as unknown as () => void)()

describe('tenant-theme plugin', () => {
  let original: { primary: string, neutral: string }

  beforeEach(() => {
    const colors = useAppConfig().ui.colors as { primary: string, neutral: string }
    original = { primary: colors.primary, neutral: colors.neutral }
  })

  afterEach(() => {
    Object.assign(useAppConfig().ui.colors, original)
    useState('tenant').value = null
  })

  const colors = () => useAppConfig().ui.colors as { primary: string, neutral: string }

  it('applies the tenant\'s palette', () => {
    useState('tenant').value = validTenantConfig('shop.example', { primaryColor: 'emerald', neutralColor: 'stone' })

    run()

    expect(colors()).toMatchObject({ primary: 'emerald', neutral: 'stone' })
  })

  it.each([
    ['a colour Tailwind does not have', 'hotpink'],
    ['a CSS value', '#ff0000'],
    ['an empty value', ''],
  ])('ignores %s', (_case, value) => {
    useState('tenant').value = validTenantConfig('shop.example', { primaryColor: value, neutralColor: value })

    run()

    expect(colors()).toEqual(expect.objectContaining(original))
  })

  it('keeps the platform palette without a tenant', () => {
    useState('tenant').value = null

    run()

    expect(colors()).toEqual(expect.objectContaining(original))
  })
})
