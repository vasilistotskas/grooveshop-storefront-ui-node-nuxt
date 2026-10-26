import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoginFormModal from '~/components/Account/Login/FormModal.vue'
import WebsideLoginFormModal from '~/components/variants/webside/Account/Login/FormModal.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The sign-in dialog the blog opens for a guest (`useCloseOnSignIn`,
 * shared by both trees): it closes itself the moment the session arrives,
 * and only then.
 */
const session = vi.hoisted(() => ({ loggedIn: undefined as unknown as { value: boolean } }))
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  return {
    loggedIn: session.loggedIn,
    user: ref(null),
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

beforeEach(() => {
  if (session.loggedIn) session.loggedIn.value = false
})

describe.each(trees(LoginFormModal, WebsideLoginFormModal))('$tree Account/Login/FormModal', ({ C, own }) => {
  const mountOpen = () => mountSuspended(C, {
    route: false,
    props: { modelValue: true },
    global: { stubs: { [own('AccountLoginForm')]: true } },
  })

  it('stays open while the visitor is a guest', async () => {
    const wrapper = await mountOpen()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes once the session arrives', async () => {
    const wrapper = await mountOpen()

    session.loggedIn.value = true
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('does not close on the session ending', async () => {
    session.loggedIn.value = true
    const wrapper = await mountOpen()
    await flushPromises()

    session.loggedIn.value = false
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
