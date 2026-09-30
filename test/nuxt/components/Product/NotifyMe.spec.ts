import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ProductAlert, ProductAlertKindEnum } from '~~/shared/openapi/types.gen'
import NotifyMe from '~/components/Product/NotifyMe.vue'
import WebsideNotifyMe from '~/components/variants/webside/Product/NotifyMe.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { trees } from '~~/test/helpers/trees'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd, session } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    toastAdd: vi.fn(),
    session: { loggedIn: ref(false), user: ref<{ id: number, email: string } | null>(null) },
  }
})
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useUserSession', () => () => ({
  ...session,
  session: { value: {} },
  ready: { value: true },
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const ALERTS = '/api/products/alerts'

function makeAlert(overrides: Partial<ProductAlert> = {}): ProductAlert {
  return {
    id: 5,
    uuid: fixtureUuid(8, 5),
    kind: 'restock',
    product: 3,
    user: 7,
    email: '',
    targetPrice: null,
    isActive: true,
    notifiedAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

const page = (results: ProductAlert[]) => ({ results, count: results.length })
const failWith = (statusCode: number) => () => {
  throw Object.assign(new Error('Request failed'), { statusCode })
}

// The modal's own open/close behaviour is Nuxt UI's; this stub keeps
// the component's contract observable in place: the trigger asks to
// open, and the form is rendered only while `open` is true.
const UModal = {
  props: ['open', 'title', 'description'],
  emits: ['update:open'],
  template: `<div>
    <div data-testid="trigger" @click="$emit('update:open', true)"><slot /></div>
    <div v-if="open" data-testid="modal"><slot name="body" /></div>
  </div>`,
}

describe.each(trees(NotifyMe, WebsideNotifyMe))('$tree Product/NotifyMe', ({ C }) => {
  const mountAlert = async (props: { kind?: ProductAlertKindEnum, currentPrice?: number | null } = {}) => {
    const wrapper = await mountSuspended(C, {
      props: { productId: 3, ...props },
      global: { stubs: { UModal } },
      route: false,
    })
    await flushPromises()
    return wrapper
  }
  const openAndSubmit = async (wrapper: Awaited<ReturnType<typeof mountAlert>>, fill: Record<string, string> = {}) => {
    await wrapper.get('[data-testid="trigger"] button').trigger('click')
    for (const [selector, value] of Object.entries(fill)) {
      await wrapper.get(`[data-testid="modal"] ${selector}`).setValue(value)
    }
    await wrapper.get('[data-testid="modal"] form').trigger('submit')
    await flushPromises()
  }
  const posts = () => api.callsTo(ALERTS).filter(call => call.options?.method === 'POST')
  const lookups = () => api.callsTo(ALERTS).filter(call => call.options?.method === 'GET')

  beforeEach(() => {
    clearNuxtData()
    session.loggedIn.value = false
    session.user.value = null
    api.routes({ [ALERTS]: (_url: string, options?: { method?: string }) => (options?.method === 'GET' ? page([]) : makeAlert()) })
  })

  it('subscribes a guest by email, confirms it and closes the form, without looking up alerts', async () => {
    const wrapper = await mountAlert()

    await openAndSubmit(wrapper, { 'input[type="email"]': 'guest@example.com' })

    expect(posts()).toEqual([{
      url: ALERTS,
      options: expect.objectContaining({ body: { kind: 'restock', product: 3, email: 'guest@example.com' } }),
    }])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Η ειδοποίηση ενεργοποιήθηκε', color: 'success' }))
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
    // A guest cannot be identified without their email: no lookup.
    expect(lookups()).toHaveLength(0)
  })

  it('refuses a guest without a valid email', async () => {
    const wrapper = await mountAlert()

    await openAndSubmit(wrapper, { 'input[type="email"]': 'not-an-email' })

    expect(posts()).toHaveLength(0)
    expect(wrapper.get('[data-testid="modal"]').text()).toContain(useNuxtApp().$i18n.t('validation.email.valid'))
  })

  it('looks up a signed-in shopper\'s alert and subscribes them without sending an email', async () => {
    session.loggedIn.value = true
    session.user.value = { id: 7, email: 'maria@example.com' }
    const wrapper = await mountAlert()

    expect(lookups()).toEqual([{
      url: ALERTS,
      options: expect.objectContaining({ query: { product: 3, kind: 'restock', isActive: true, pageSize: 1 } }),
    }])

    await wrapper.get('[data-testid="trigger"] button').trigger('click')
    expect(wrapper.get('[data-testid="modal"]').text()).toContain('Θα στείλουμε την ειδοποίηση στο maria@example.com.')
    expect(wrapper.find('[data-testid="modal"] input[type="email"]').exists()).toBe(false)

    await wrapper.get('[data-testid="modal"] form').trigger('submit')
    await flushPromises()

    expect(posts()).toHaveLength(1)
    expect(posts()[0]!.options.body).toEqual({ kind: 'restock', product: 3 })
  })

  it('shows an active alert instead of the form, and turns it off', async () => {
    session.loggedIn.value = true
    session.user.value = { id: 7, email: 'maria@example.com' }
    let active = [makeAlert()]
    api.routes({
      [ALERTS]: () => page(active),
      [`${ALERTS}/5`]: () => { active = [] },
    })
    const wrapper = await mountAlert()

    expect(wrapper.text()).toContain('Η ειδοποίηση διαθεσιμότητας είναι ενεργή')
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(false)

    await wrapper.findAll('button').find(b => b.text() === 'Απενεργοποίηση ειδοποίησης')!.trigger('click')
    await flushPromises()

    expect(api.callsTo(`${ALERTS}/5`)).toEqual([
      { url: `${ALERTS}/5`, options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Η ειδοποίηση απενεργοποιήθηκε' }))
    // Re-read, so the form comes back.
    expect(lookups()).toHaveLength(2)
    expect(wrapper.find('[data-testid="trigger"]').exists()).toBe(true)
  })

  it('treats a 409 as "already subscribed" and re-reads the alert', async () => {
    session.loggedIn.value = true
    session.user.value = { id: 7, email: 'maria@example.com' }
    api.routes({ [ALERTS]: (_url: string, options?: { method?: string }) => (options?.method === 'GET' ? page([]) : failWith(409)()) })
    const wrapper = await mountAlert()

    await openAndSubmit(wrapper)

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Έχεις ήδη ενεργή ειδοποίηση', color: 'warning' }))
    expect(lookups()).toHaveLength(2)
  })

  it('reports any other failure as an error and keeps the form open', async () => {
    api.routes({ [ALERTS]: failWith(500) })
    const wrapper = await mountAlert()

    await openAndSubmit(wrapper, { 'input[type="email"]': 'guest@example.com' })

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Αποτυχία ενεργοποίησης', color: 'error' }))
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
  })

  describe('price drop', () => {
    it('refuses a target above the current price', async () => {
      const wrapper = await mountAlert({ kind: 'price_drop', currentPrice: 20 })

      await openAndSubmit(wrapper, { 'input[type="email"]': 'guest@example.com', 'input[type="number"]': '25' })

      expect(posts()).toHaveLength(0)
      expect(wrapper.get('[data-testid="modal"]').text()).toContain('Η επιθυμητή τιμή πρέπει να είναι μικρότερη από την τρέχουσα.')
    })

    it('subscribes with the target price', async () => {
      const wrapper = await mountAlert({ kind: 'price_drop', currentPrice: 20 })

      await openAndSubmit(wrapper, { 'input[type="email"]': 'guest@example.com', 'input[type="number"]': '15.5' })

      expect(posts()).toHaveLength(1)
      expect(posts()[0]!.options.body).toEqual({ kind: 'price_drop', product: 3, email: 'guest@example.com', targetPrice: 15.5 })
    })

    it('names the target of an active price alert', async () => {
      session.loggedIn.value = true
      session.user.value = { id: 7, email: 'maria@example.com' }
      api.routes({ [ALERTS]: () => page([makeAlert({ kind: 'price_drop', targetPrice: 15 })]) })

      const wrapper = await mountAlert({ kind: 'price_drop', currentPrice: 20 })

      expect(wrapper.text()).toContain('Θα σε ειδοποιήσουμε μόλις η τιμή φτάσει στα 15 € ή χαμηλότερα.')
    })
  })
})
