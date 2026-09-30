import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ButtonBlogPostLike from '~/components/Button/Blog/Post/Like.vue'
import WebsideButtonBlogPostLike from '~/components/variants/webside/Button/Blog/Post/Like.vue'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'

/**
 * A reader likes or unlikes a post. The store's like state and the
 * parent's count change only once Django accepted the toggle; a refusal
 * is one toast carrying Django's `detail`, and the click handler settles
 * — UButton awaits it, so a rejection would reach Vue's error handler.
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

// A guest's click opens the lazy sign-in modal: a module that loads after
// the test ends fails the environment teardown, so it is mocked.
const { ModalStub } = await vi.hoisted(async () => {
  const { defineComponent, h } = await import('vue')
  return { ModalStub: defineComponent({ render: () => h('div', { 'data-test': 'login-modal' }) }) }
})
vi.mock('~/components/Account/Login/FormModal.vue', () => ({ default: ModalStub }))
vi.mock('~/components/variants/webside/Account/Login/FormModal.vue', () => ({ default: ModalStub }))

const LIKES = '/api/blog/posts/3/update-likes'

describe.each(trees(ButtonBlogPostLike, WebsideButtonBlogPostLike))('$tree Button/Blog/Post/Like', ({ C }) => {
  beforeEach(() => {
    loggedIn.value = true
    useUserStore().blogLikedPosts = []
  })

  const mount = () => mountSuspended(C, { route: false, props: { blogPostId: 3, likesCount: 4 } })
  const click = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    const settled = wrapper.findComponent({ name: 'UButton' }).props('onClick')(new MouseEvent('click'))
    await flushPromises()
    return settled
  }

  it('likes the post once Django accepts it', async () => {
    api.routes({ [LIKES]: null })
    const wrapper = await mount()

    await click(wrapper)

    expect(api.callsTo(LIKES)).toEqual([{ url: LIKES, options: expect.objectContaining({ method: 'POST' }) }])
    expect(useUserStore().blogLikedPosts).toEqual([3])
    expect(wrapper.emitted('update')).toEqual([[{ blogPostId: 3, liked: true }]])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('unlikes a post the reader already likes', async () => {
    api.routes({ [LIKES]: null })
    useUserStore().blogLikedPosts = [3]
    const wrapper = await mount()

    await click(wrapper)

    expect(useUserStore().blogLikedPosts).toEqual([])
    expect(wrapper.emitted('update')).toEqual([[{ blogPostId: 3, liked: false }]])
  })

  it('shows Django\'s reason once and changes nothing when the toggle is refused', async () => {
    api.routes({ [LIKES]: failWith(429, { detail: 'Πολλά αιτήματα' }) })
    const wrapper = await mount()

    await expect(click(wrapper)).resolves.toBeUndefined()

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Πολλά αιτήματα', color: 'error' })
    expect(useUserStore().blogLikedPosts).toEqual([])
    expect(wrapper.emitted('update')).toBeUndefined()
  })

  it('falls back to a generic message when the refusal names no reason', async () => {
    api.routes({ [LIKES]: failWith(502) })
    const wrapper = await mount()

    await click(wrapper)

    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('error_occurred'), color: 'error' })
  })

  it('asks a guest to sign in instead of calling Django', async () => {
    loggedIn.value = false
    const wrapper = await mount()

    await click(wrapper)

    expect(api.callsTo(LIKES)).toHaveLength(0)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    await vi.waitFor(() => expect(wrapper.find('[data-test="login-modal"]').exists()).toBe(true))
  })
})
