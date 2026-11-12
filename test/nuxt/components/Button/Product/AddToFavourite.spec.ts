import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, onMounted, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ButtonProductAddToFavourite from '~/components/Button/Product/AddToFavourite.vue'
import WebsideButtonProductAddToFavourite from '~/components/variants/webside/Button/Product/AddToFavourite.vue'
import type { ProductFavouriteWrite } from '~~/shared/openapi/types.gen'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

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
// Whether the client has the session yet (nuxt-auth-utils `ready`): one ref
// every caller shares, so a test can let the session arrive.
const { ready } = await vi.hoisted(async () => ({ ready: (await import('vue')).ref(true) }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(loggedIn.value),
  user: ref({ id: 7 }),
  session: ref({}),
  ready,
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const FAVOURITE: ProductFavouriteWrite = { id: 11, product: 5 }
const NAME = 'Γλάστρα'
const LOOKUP = '/api/products/favourites/favourites-by-products'
const HELD = [{ id: 11, userId: 7, productId: 5, createdAt: '2026-11-12T10:00:00Z' }]

describe.each(trees(ButtonProductAddToFavourite, WebsideButtonProductAddToFavourite))('$tree Button/Product/AddToFavourite', ({ tree, C }) => {
  const COPY = inlineCopy(tree === 'default' ? 'app/components/Button/Product/AddToFavourite.vue' : 'app/components/variants/webside/Button/Product/AddToFavourite.vue')

  beforeEach(() => {
    setTenant()
    loggedIn.value = true
    ready.value = true
    useUserStore().clearAccountState()
    api.routes({ [LOOKUP]: [] })
  })

  const mount = (favouriteId: number | null = null) =>
    mountSuspended(C, { route: false, props: { productId: 5, productName: NAME, userId: 7, favouriteId } })
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
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('error_occurred'),
      color: 'error',
      ...(detail ? { description: detail } : {}),
    }))
    expect(useUserStore().favouriteProductIds).toEqual({})
    expect(control(wrapper).props('loading')).toBe(false)
  })

  // Every heart asks for its own product when it mounts, so whatever draws
  // one shows the shopper's favourite (the store batches them, user.spec).
  it('asks for its product\'s state when it mounts', async () => {
    await mount()
    await flushPromises()

    expect(api.callsTo(LOOKUP)).toEqual([{ url: LOOKUP, options: expect.objectContaining({ method: 'POST', body: { productIds: [5] } }) }])
  })

  it.each([
    ['for a guest', () => { loggedIn.value = false }],
    ['with the store\'s favourites off', () => setTenantFeatures({ favourites: false })],
  ])('asks nothing %s', async (_case, arrange) => {
    arrange()

    await mount()
    await flushPromises()

    expect(api.callsTo(LOOKUP)).toEqual([])
  })

  // A toggle button (WAI-ARIA): one name, the product's, in both states, so
  // a list of hearts tells its products apart and the state is announced
  // once, from `aria-pressed`. The tooltip says what a click does.
  it.each([
    [null, 'false', 'add'],
    [11, 'true', 'remove'],
  ] as const)('keeps its name and says whether it is pressed: favourite %s', async (favouriteId, pressed, action) => {
    const button = control(await mount(favouriteId))

    expect(button.attributes('aria-label')).toBe(COPY.name.replace('{name}', NAME))
    expect(button.attributes('aria-pressed')).toBe(pressed)
    expect(button.attributes('title')).toBe(COPY[action])
  })

  /** The heart as a card draws it: its favourite read from the store, so a click shows. */
  const mountFromStore = async () => {
    const deleted: number[] = []
    const Card = defineComponent({
      setup: () => () => h(C, {
        productId: 5,
        productName: NAME,
        userId: 7,
        favouriteId: useUserStore().getFavouriteIdByProductId(5) ?? null,
        onFavouriteDelete: (id: number) => deleted.push(id),
      }),
    })
    const wrapper = await mountSuspended(Card, { route: false })
    await flushPromises()
    return { wrapper, deleted }
  }
  const pressed = (wrapper: Awaited<ReturnType<typeof mountFromStore>>['wrapper']) => wrapper.get('[aria-pressed]').attributes('aria-pressed')
  const clickHeart = async (wrapper: Awaited<ReturnType<typeof mountFromStore>>['wrapper']) => {
    const settled = wrapper.findComponent({ name: 'UButton' }).props('onClick')(new MouseEvent('click'))
    await flushPromises()
    return settled
  }

  // The heart showed the guest's state, or another tab changed it: the
  // server already holds the favourite, so the heart is pressed, as the
  // server says, whatever else happens, and the shopper hears of the change
  // they wanted, not of an error. Its id is asked for only to remove it.
  it('presses the heart when an add answers already_favourited, asking nothing more', async () => {
    const { wrapper } = await mountFromStore()
    api.routes({ [LOOKUP]: failWith(502), '/api/products/favourites': failWith(400, { detail: 'Υπάρχει ήδη', code: 'already_favourited' }) })

    await clickHeart(wrapper)

    expect(pressed(wrapper)).toBe('true')
    expect(api.callsTo(LOOKUP)).toHaveLength(1)
    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('removes a favourite whose id it never had: asks for the id, then deletes it', async () => {
    useUserStore().markFavouriteProduct(5)
    api.routes({ [LOOKUP]: HELD, '/api/products/favourites/11': null })
    const { wrapper, deleted } = await mountFromStore()

    await clickHeart(wrapper)

    expect(api.callsTo('/api/products/favourites/*').map(call => call.url)).toEqual([LOOKUP, '/api/products/favourites/11'])
    expect(pressed(wrapper)).toBe('false')
    expect(deleted).toEqual([11])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: COPY.removed }))
  })

  it('says it could not remove a favourite whose id cannot be found, and keeps it pressed', async () => {
    useUserStore().markFavouriteProduct(5)
    api.routes({ [LOOKUP]: failWith(502) })
    const { wrapper } = await mountFromStore()

    await clickHeart(wrapper)

    expect(api.callsTo('/api/products/favourites/*').map(call => call.url)).toEqual([LOOKUP])
    expect(pressed(wrapper)).toBe('true')
    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: useNuxtApp().$i18n.t('error_occurred'), color: 'error' }))
  })

  // A shared device: the shopper signs out while their click is out. Its
  // answer is theirs, not the next session's.
  it.each([
    ['an added favourite', (resolve: (value: unknown) => void) => resolve(FAVOURITE)],
    ['already_favourited', (_resolve: unknown, reject: (reason: unknown) => void) => {
      try {
        failWith(400, { code: 'already_favourited' })()
      }
      catch (error) {
        reject(error)
      }
    }],
  ])('writes nothing when the shopper signed out before the click was answered: %s', async (_case, settle) => {
    let answer!: () => void
    api.routes({ [LOOKUP]: [], '/api/products/favourites': () => new Promise((resolve, reject) => {
      answer = () => settle(resolve, reject)
    }) })
    const { wrapper } = await mountFromStore()
    const settled = clickHeart(wrapper)

    useUserStore().clearAccountState()
    answer()
    await settled
    await flushPromises()

    expect(useUserStore().favouriteProductIds).toEqual({})
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('drops a favourite that is already gone when a removal answers 404', async () => {
    useUserStore().favouriteProductIds = { 5: 11 }
    api.routes({ [LOOKUP]: HELD, '/api/products/favourites/11': failWith(404, { detail: 'Δεν βρέθηκε', code: 'not_found' }) })
    const wrapper = await mount(11)

    await click(wrapper)

    expect(useUserStore().favouriteProductIds).toEqual({})
    expect(wrapper.emitted('favourite-delete')).toEqual([[11]])
    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ title: useNuxtApp().$i18n.t('error_occurred') }))
  })

  // A heart that hydrates after another heart asked for its product (a rail
  // hydrated on scroll, under the grid that asked) finds the store already
  // knowing it. Its first render must still be the server's, the guest's,
  // or Vue hydrates a pressed heart over unpressed HTML and, in production,
  // never repairs it. After mount it shows the store's state as a patch.
  it('draws the guest\'s heart in its first render and the store\'s after mount, whatever the store knew', async () => {
    useUserStore().favouriteProductIds = { 5: 11 }
    let firstRender: string | null | undefined
    // A parent's mounted hook runs after the heart's, before the re-render
    // its mount schedules: the DOM it reads is the heart's first render.
    const Page = defineComponent({
      setup() {
        onMounted(() => {
          firstRender = document.querySelector('[data-heart] [aria-pressed]')?.getAttribute('aria-pressed')
        })
        return () => h('div', { 'data-heart': '' }, [h(C, { productId: 5, productName: NAME, userId: 7, favouriteId: 11 })])
      },
    })

    const wrapper = await mountSuspended(Page, { route: false, attachTo: document.body })
    await flushPromises()

    expect(firstRender).toBe('false')
    expect(wrapper.get('[aria-pressed]').attributes('aria-pressed')).toBe('true')
  })

  // The session reaches the client after the page has resolved, and a heart
  // can be clicked before then: the click waits for it, and a signed-in
  // shopper is not told to sign in.
  it('waits for the session before it decides who clicked', async () => {
    ready.value = false
    api.routes({ [LOOKUP]: [], '/api/products/favourites': FAVOURITE })
    const wrapper = await mount()

    const settled = control(wrapper).props('onClick')(new MouseEvent('click'))
    await flushPromises()

    expect(toastAdd).not.toHaveBeenCalled()
    expect(api.callsTo('/api/products/favourites')).toEqual([])
    expect(control(wrapper).props('loading')).toBe(true)

    ready.value = true
    await settled
    await flushPromises()

    expect(api.callsTo('/api/products/favourites')).toHaveLength(1)
    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('asks a guest to sign in instead of calling Django', async () => {
    loggedIn.value = false
    const wrapper = await mount()

    await click(wrapper)

    expect(api.callsTo('/api/products/*')).toHaveLength(0)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })
})
