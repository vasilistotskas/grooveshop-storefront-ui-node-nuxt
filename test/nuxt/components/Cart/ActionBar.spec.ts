import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { resolve } from 'node:path'
import YAML from 'yaml'
import ActionBar from '~/components/Cart/ActionBar.vue'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The phone's floating checkout bar: the total and the way to checkout,
 * held back while stock problems stand.
 */
const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Cart/ActionBar.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const mountBar = (props: { total: number, blocked: boolean }) => mountSuspended(ActionBar, { props, route: false })

describe('Cart/ActionBar', () => {
  it('shows the total and links to checkout', async () => {
    const wrapper = await mountBar({ total: 102.66, blocked: false })

    expect(wrapper.text().replace(/\s+/g, ' ')).toContain(useNuxtApp().$i18n.n(102.66, 'currency').replace(/\s+/g, ' '))
    expect(wrapper.find('a').attributes('href')).toBe('/checkout')
    expect(wrapper.text()).toContain(messages.checkout)
  })

  it('says to fix the stock problems instead, and does not let checkout through', async () => {
    const wrapper = await mountBar({ total: 20, blocked: true })

    expect(wrapper.text()).toContain(messages.fix)
    expect(wrapper.text()).not.toContain(messages.checkout)
    expect(wrapper.find('[aria-disabled="true"]').exists()).toBe(true)
  })
})
