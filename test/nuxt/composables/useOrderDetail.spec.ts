import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, ref } from 'vue'
import type { Ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { OrderDetail } from '~~/shared/openapi/types.gen'
import { makeOrder } from '~~/test/fixtures/order'

/**
 * The account order page's order (`useOrderDetail`), rendered on the
 * server as a signed-in shopper's direct load is. The order arrives when
 * the read resolves, after the page's setup has registered everything it
 * keeps: the page must render with it, or the server sends an empty page
 * and the browser's hydration finds the whole order missing. `mountSuspended`
 * renders on the client only and cannot see this.
 */
const read = vi.hoisted(() => ({ data: null as unknown as Ref<OrderDetail | undefined>, error: null as unknown as Ref<unknown> }))

mockNuxtImport('useApi', () => () => {
  read.data = ref<OrderDetail>()
  read.error = ref<unknown>()
  const state = { data: read.data, error: read.error, refresh: () => Promise.resolve() }
  // Like Nuxt's: the data is filled when the read resolves, not before.
  const resolved = Promise.resolve().then(() => {
    read.data.value = makeOrder({ id: 3 })
    return state
  })
  return Object.assign(resolved, state)
})

const Page = defineComponent({
  async setup() {
    const { order, stale } = await useOrderDetail()
    return () => h('main', order.value ? `#${order.value.id}${stale.value ? ' stale' : ''}` : 'no order')
  },
})

async function renderOnServer() {
  const app = createSSRApp(Page)
  app.config.globalProperties.$nuxt = useNuxtApp()
  return renderToString(app)
}

describe('useOrderDetail', () => {
  it('renders the order on the server', async () => {
    expect(await renderOnServer()).toBe('<main>#3</main>')
  })
})
