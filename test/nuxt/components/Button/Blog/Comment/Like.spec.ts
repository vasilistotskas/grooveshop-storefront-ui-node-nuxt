import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ButtonBlogCommentLike from '~/components/Button/Blog/Comment/Like.vue'
import WebsideButtonBlogCommentLike from '~/components/variants/webside/Button/Blog/Comment/Like.vue'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'

/**
 * A reader likes or unlikes a comment. The like state and the parent's
 * count change only once Django accepted the toggle; a refusal is one
 * toast carrying Django's `detail`, and the click handler settles.
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

const LIKES = '/api/blog/comments/8/update-likes'

describe.each(trees(ButtonBlogCommentLike, WebsideButtonBlogCommentLike))('$tree Button/Blog/Comment/Like', ({ C }) => {
  beforeEach(() => {
    loggedIn.value = true
    useUserStore().blogLikedComments = []
  })

  const mount = () => mountSuspended(C, { route: false, props: { blogCommentId: 8, likesCount: 2 } })
  const click = async (wrapper: Awaited<ReturnType<typeof mount>>) => {
    const settled = wrapper.findComponent({ name: 'UButton' }).props('onClick')(new MouseEvent('click'))
    await flushPromises()
    return settled
  }

  it('likes the comment once Django accepts it', async () => {
    api.routes({ [LIKES]: null })
    const wrapper = await mount()

    await click(wrapper)

    expect(api.callsTo(LIKES)).toEqual([{ url: LIKES, options: expect.objectContaining({ method: 'POST' }) }])
    expect(useUserStore().blogLikedComments).toEqual([8])
    expect(wrapper.emitted('update')).toEqual([[{ blogCommentId: 8, liked: true }]])
  })

  it('unlikes a comment the reader already likes', async () => {
    api.routes({ [LIKES]: null })
    useUserStore().blogLikedComments = [8]
    const wrapper = await mount()

    await click(wrapper)

    expect(useUserStore().blogLikedComments).toEqual([])
    expect(wrapper.emitted('update')).toEqual([[{ blogCommentId: 8, liked: false }]])
  })

  it('shows Django\'s reason once and changes nothing when the toggle is refused', async () => {
    api.routes({ [LIKES]: failWith(429, { detail: 'Πολλά αιτήματα' }) })
    const wrapper = await mount()

    await expect(click(wrapper)).resolves.toBeUndefined()

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Πολλά αιτήματα', color: 'error' })
    expect(useUserStore().blogLikedComments).toEqual([])
    expect(wrapper.emitted('update')).toBeUndefined()
  })

  it('asks a guest to sign in instead of calling Django', async () => {
    loggedIn.value = false
    const wrapper = await mount()

    await click(wrapper)

    expect(api.callsTo(LIKES)).toHaveLength(0)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })
})
