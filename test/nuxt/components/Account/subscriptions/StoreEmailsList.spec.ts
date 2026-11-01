import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import StoreEmailsList from '~/components/Account/subscriptions/StoreEmailsList.vue'
import WebsideStoreEmailsList from '~/components/variants/webside/Account/subscriptions/StoreEmailsList.vue'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'
import { makeEmailPreferences } from '~~/test/fixtures/subscription'

/**
 * "Store emails" in both designs: one switch per marketing email the store
 * sends, which turns it on or off through `PATCH /api/user/email-preferences`
 * (`useEmailPreferences`). Mocked at the request, so the real composable runs.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const URL = '/api/user/email-preferences'

beforeEach(() => {
  clearNuxtData(['emails:preferences:el'])
})

describe.each(trees(StoreEmailsList, WebsideStoreEmailsList))('$tree Account/subscriptions/StoreEmailsList', ({ C }) => {
  async function mountList() {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  const switchOf = (wrapper: Awaited<ReturnType<typeof mountList>>, title: string) =>
    wrapper.get(`[role="switch"][aria-label="${title}"]`)

  it('shows each store email with whether the customer still receives it', async () => {
    api.routes({ [URL]: makeEmailPreferences() })

    const wrapper = await mountList()

    expect(switchOf(wrapper, 'Υπενθύμιση ολοκλήρωσης αγοράς').attributes('aria-checked')).toBe('true')
    expect(switchOf(wrapper, 'Μας λείπετε').attributes('aria-checked')).toBe('false')
  })

  it('turns a declined email back on and shows the list Django answers', async () => {
    api.routes({
      [URL]: (_url: string, options?: { method?: string }) => options?.method === 'PATCH'
        ? makeEmailPreferences([
            { key: 'cart.checkout_abandoned', title: 'Υπενθύμιση ολοκλήρωσης αγοράς', enabled: true },
            { key: 'user.reengagement', title: 'Μας λείπετε', enabled: true },
          ])
        : makeEmailPreferences(),
    })
    const wrapper = await mountList()

    await switchOf(wrapper, 'Μας λείπετε').trigger('click')
    await flushPromises()

    expect(api.callsTo(URL).find(call => call.options?.method === 'PATCH')?.options.body)
      .toEqual({ types: [{ key: 'user.reengagement', enabled: true }] })
    expect(switchOf(wrapper, 'Μας λείπετε').attributes('aria-checked')).toBe('true')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('email_preferences_notifications.enabled_title'),
      color: 'success',
    }))
  })

  it('reads the list again when Django refuses, so the switch shows what is true', async () => {
    let reads = 0
    api.routes({
      [URL]: (_url: string, options?: { method?: string }) => {
        if (options?.method === 'PATCH') return failWith(400, { detail: 'nope', code: 'unknown_email_type' })()
        reads += 1
        return makeEmailPreferences()
      },
    })
    const wrapper = await mountList()

    await switchOf(wrapper, 'Μας λείπετε').trigger('click')
    await flushPromises()

    expect(reads).toBe(2)
    expect(switchOf(wrapper, 'Μας λείπετε').attributes('aria-checked')).toBe('false')
  })

  it('shows nothing when the store sends no marketing email', async () => {
    api.routes({ [URL]: makeEmailPreferences([]) })

    const wrapper = await mountList()

    expect(wrapper.find('[role="switch"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
