import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideSocials from '~/components/variants/webside/Socials.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Webside's social row: the store's networks in webside's order, LinkedIn
 * last (the store's request, 2026-11-21), X among them.
 */
describe('webside Socials', () => {
  beforeEach(() => {
    setTenant({
      socialsInstagram: 'https://instagram.com/webside',
      socialsFacebook: 'https://facebook.com/webside',
      socialsLinkedin: 'https://linkedin.com/company/webside',
      socialsDiscord: 'https://discord.gg/webside',
      socialsTwitter: 'https://x.com/webside',
      socialsYoutube: '',
    })
  })

  it('draws the networks the store has, LinkedIn last, each named', async () => {
    const wrapper = await mountSuspended(WebsideSocials, { route: false })

    expect(wrapper.findAll('a').map(link => [link.attributes('aria-label'), link.attributes('href')])).toEqual([
      ['Instagram', 'https://instagram.com/webside'],
      ['Facebook', 'https://facebook.com/webside'],
      ['X', 'https://x.com/webside'],
      ['Discord', 'https://discord.gg/webside'],
      ['LinkedIn', 'https://linkedin.com/company/webside'],
    ])
  })
})
