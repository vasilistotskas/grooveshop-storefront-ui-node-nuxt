import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The store's social links, in the order a design names: only the networks
 * the store filled in, each with its mark and its name. X is one of them
 * (`socialsTwitter`), drawn with its current mark.
 */
const read = async (order: readonly SocialNetwork[]) => {
  let links: StoreSocialLink[] = []
  await mountSuspended(defineComponent({
    setup() {
      links = useStoreSocials(order).socials.value
      return () => h('div')
    },
  }), { route: false })
  return links
}

describe('useStoreSocials', () => {
  beforeEach(() => {
    setTenant({
      socialsFacebook: 'https://facebook.com/store',
      socialsTwitter: 'https://x.com/store',
      socialsLinkedin: 'https://linkedin.com/company/store',
      socialsInstagram: '',
    })
  })

  it('lists the networks the store has, in the order asked, each named', async () => {
    const links = await read(['linkedin', 'instagram', 'twitter', 'facebook'])

    expect(links.map(link => [link.key, link.url, link.label])).toEqual([
      ['linkedin', 'https://linkedin.com/company/store', 'LinkedIn'],
      ['twitter', 'https://x.com/store', 'X'],
      ['facebook', 'https://facebook.com/store', 'Facebook'],
    ])
  })

  it('draws X with its current mark, not the retired bird', async () => {
    const [x] = await read(['twitter'])

    expect(x!.icon).toBe('i-brand-x')
  })
})
