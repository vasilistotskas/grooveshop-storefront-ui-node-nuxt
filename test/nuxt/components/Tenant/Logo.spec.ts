import { describe, it, expect, beforeEach } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TenantLogo from '~/components/Tenant/Logo.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The store's logo, or its name as a wordmark when it has none. On an
 * inverted surface (the sign-in layout's ink panel) it shows the logo
 * meant for the opposite ground. Which image shows in which scheme is
 * decided by Tailwind's `dark:` classes, and happy-dom computes no
 * styles, so the classes are the contract here.
 */
const LIGHT = 'https://cdn.example/logo-light.png'
const DARK = 'https://cdn.example/logo-dark.png'

const imageFor = (wrapper: VueWrapper, file: string) => {
  const image = wrapper.findAll('img').find(img => img.attributes('src')?.includes(file))
  return image!.classes()
}

describe('Tenant/Logo', () => {
  beforeEach(() => {
    setTenant({ logoLightUrl: LIGHT, logoDarkUrl: DARK })
  })

  it('shows the light-ground logo in the light scheme and the dark-ground one in the dark', async () => {
    const wrapper = await mountSuspended(TenantLogo)

    expect(imageFor(wrapper, 'logo-light')).toContain('dark:hidden')
    expect(imageFor(wrapper, 'logo-dark')).toEqual(expect.arrayContaining(['hidden', 'dark:block']))
  })

  it('swaps them on an inverted surface', async () => {
    const wrapper = await mountSuspended(TenantLogo, { props: { inverted: true } })

    expect(imageFor(wrapper, 'logo-light')).toEqual(expect.arrayContaining(['hidden', 'dark:block']))
    expect(imageFor(wrapper, 'logo-dark')).toContain('dark:hidden')
  })

  it.each([
    [false, 'text-highlighted'],
    [true, 'text-inverted'],
  ])('writes the store name as the wordmark (inverted: %s) in %s', async (inverted, colour) => {
    setTenant({ storeName: 'Groove Demo' })

    const wrapper = await mountSuspended(TenantLogo, { props: { inverted } })

    const wordmark = wrapper.get('span')
    expect(wordmark.text()).toBe('Groove Demo')
    expect(wordmark.classes()).toContain(colour)
  })
})
