import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import UserAvatar from '~/components/User/Avatar.vue'
import { makeUserDetails } from '~~/test/fixtures/user'
import { failWith } from '~~/test/helpers/api'

/**
 * The account avatar uploads a new picture: while it uploads the picker
 * gives way to a skeleton, and whatever the answer the picker comes back
 * — a refusal used to leave the skeleton up for good.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd, fetchSession } = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  fetchSession: vi.fn(() => Promise.resolve()),
}))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: fetchSession,
  clear: () => Promise.resolve(),
}))

// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })
// UFileUpload renders its own file list; the stub keeps the v-model and
// slot contract the avatar relies on.
mockComponent('UFileUpload', {
  name: 'UFileUpload',
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template: '<div data-test="picker"><slot :open="() => {}" /></div>',
})

const ACCOUNT = '/api/user/account/7'
const picture = () => new File(['png'], 'me.png', { type: 'image/png' })

describe('User/Avatar', () => {
  beforeEach(() => {
    fetchSession.mockImplementation(() => Promise.resolve())
    // Node's URL rejects happy-dom's File; the preview URL is the browser's.
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
  })

  const mount = () => mountSuspended(UserAvatar, {
    route: false,
    props: { userAccount: makeUserDetails({ id: 7 }), changeAvatar: true },
  })
  const choose = async (wrapper: Awaited<ReturnType<typeof mount>>, file: File) => {
    wrapper.findComponent({ name: 'UFileUpload' }).vm.$emit('update:modelValue', file)
    await flushPromises()
  }

  it('uploads the chosen picture, refreshes the session and offers the picker again', async () => {
    api.routes({ [ACCOUNT]: makeUserDetails({ id: 7 }) })
    const wrapper = await mount()

    await choose(wrapper, picture())

    const [call] = api.callsTo(ACCOUNT)
    expect(call!.options.method).toBe('PATCH')
    expect((call!.options.body as FormData).get('image')).toBeInstanceOf(File)
    expect(fetchSession).toHaveBeenCalledOnce()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.findComponent({ name: 'UFileUpload' }).exists()).toBe(true)
    // The preview of the uploaded file is released once it is cleared.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('says so when the upload is refused, and offers the picker again', async () => {
    api.routes({ [ACCOUNT]: failWith(413) })
    const wrapper = await mount()

    await choose(wrapper, picture())

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(fetchSession).not.toHaveBeenCalled()
    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UFileUpload' }).exists()).toBe(true)
  })

  it('refuses a file type it cannot store, without uploading', async () => {
    const wrapper = await mount()

    await choose(wrapper, new File(['gif'], 'me.gif', { type: 'image/gif' }))

    expect(api.callsTo(ACCOUNT)).toHaveLength(0)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })
})
