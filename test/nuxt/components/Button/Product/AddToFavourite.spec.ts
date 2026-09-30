import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ButtonProductAddToFavourite from '~/components/Button/Product/AddToFavourite.vue'
import WebsideButtonProductAddToFavourite from '~/components/variants/webside/Button/Product/AddToFavourite.vue'
import type { ProductFavouriteWrite } from '~~/shared/openapi/types.gen'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'

/**
 * A signed-in shopper adds a product to their favourites or removes it.
 * The store changes only once Django accepted it, and every failure —
 * an HTTP refusal or a network error — is ONE toast in the page's
 * language: the button used to stack a hook toast on a hardcoded English
 * "An error occurred".
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd, loggedIn } = vi.hoisted(() => ({ toastAdd: vi.fn(), loggedIn: { value: true } }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(loggedIn.value),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockNuxtImport('useSettingFlag', () => () => computed(() => true))

const FAVOURITE: ProductFavouriteWrite = { id: 11, product: 5 }

describe.each(trees(ButtonProductAddToFavourite, WebsideButtonProductAddToFavourite))('$tree Button/Product/AddToFavourite', ({ C }) => {
  beforeEach(() => {
    loggedIn.value = true
    useUserStore().favouriteProductIds = {}
  })

  const mount = (favouriteId: number | null = null) =>
    mountSuspended(C, { route: false, props: { productId: 5, userId: 7, favouriteId } })
  const control = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.findComponent({ name: 'UButton' })
  const click = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    const settled = control(wrapper).props('onClick')(new MouseEvent('click'))
    await flushPromises()
    return settled
  }

  it('adds the product and remembers its favourite id', async () => {
    api.routes({ '/api/products/favourites': FAVOURITE })
    const wrapper = await mount()

    await click(wrapper)

    expect(api.callsTo('/api/products/favourites')).toEqual([{
      url: '/api/products/favourites',
      options: expect.objectContaining({ method: 'POST', body: { product: 5 } }),
    }])
    expect(useUserStore().favouriteProductIds).toEqual({ 5: 11 })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('removes a favourite and tells the list which one went', async () => {
    useUserStore().favouriteProductIds = { 5: 11 }
    api.routes({ '/api/products/favourites/11': null })
    const wrapper = await mount(11)

    await click(wrapper)

    expect(api.callsTo('/api/products/favourites/11')).toEqual([
      { url: '/api/products/favourites/11', options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(useUserStore().favouriteProductIds).toEqual({})
    expect(wrapper.emitted('favourite-delete')).toEqual([[11]])
  })

  it.each([
    ['an HTTP refusal', failWith(400, { detail: 'Υπάρχει ήδη' }), 'Υπάρχει ήδη'],
    ['a network failure', () => Promise.reject(new TypeError('fetch failed')), null],
  ])('shows one toast in the page language for %s, and frees the button', async (_case, answer, detail) => {
    api.routes({ '/api/products/favourites': answer })
    const wrapper = await mount()

    await expect(click(wrapper)).resolves.toBeUndefined()

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: detail ?? useNuxtApp().$i18n.t('error_occurred'), color: 'error' })
    expect(useUserStore().favouriteProductIds).toEqual({})
    expect(control(wrapper).props('loading')).toBe(false)
  })

  it('asks a guest to sign in instead of calling Django', async () => {
    loggedIn.value = false
    const wrapper = await mount()

    await click(wrapper)

    expect(api.callsTo('/api/products/*')).toHaveLength(0)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })
})
