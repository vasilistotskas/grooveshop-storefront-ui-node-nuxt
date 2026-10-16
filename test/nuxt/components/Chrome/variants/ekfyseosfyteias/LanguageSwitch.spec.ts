import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LanguageSwitch from '~/components/Chrome/variants/ekfyseosfyteias/LanguageSwitch.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The header's language switch: one round link per other language the
 * store serves, to the same page in it, named in that language.
 */
const mountSwitch = () => mountSuspended(LanguageSwitch, { route: '/' })

describe('Chrome/variants/ekfyseosfyteias/LanguageSwitch', () => {
  it('links a Greek page to its English twin, named and marked in English', async () => {
    setTenant({ availableLocales: ['el', 'en'] })

    const links = (await mountSwitch()).findAll('a')

    expect(links).toHaveLength(1)
    expect(links[0]!.text()).toBe('en')
    expect(links[0]!.attributes('href')).toBe('/en')
    expect(links[0]!.attributes('hreflang')).toBe('en')
    expect(links[0]!.attributes('lang')).toBe('en')
    expect(links[0]!.attributes('aria-label')).toBe('English')
  })

  it.each([[['el']], [[]]])('renders nothing for a store serving %j', async (locales) => {
    setTenant({ availableLocales: locales })

    expect((await mountSwitch()).find('a').exists()).toBe(false)
  })
})
