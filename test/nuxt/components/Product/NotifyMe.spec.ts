import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { ProductAlert, ProductAlertKindEnum } from '~~/shared/openapi/types.gen'
import NotifyMe from '~/components/Product/NotifyMe.vue'
import WebsideNotifyMe from '~/components/variants/webside/Product/NotifyMe.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'
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

/** The default's dialog: the parent owns the trigger and opens it on a kind; the stub renders body and footer while open. */
const Dialog = {
  props: ['open', 'title', 'description', 'ui'],
  template: '<div v-if="open" data-testid="modal"><slot name="body" /><div data-testid="footer"><slot name="footer" /></div></div>',
}

type Mounted = VueWrapper
interface MountOptions { kind?: ProductAlertKindEnum, currentPrice?: number | null }

/**
 * What differs between the trees: how each is mounted, how its form is
 * submitted, and its own words (el). The default's dialog is opened by its
 * parent on a kind, with a footer button wired to the form; the webside
 * copy draws a trigger and a dialog of its own per kind.
 */
const ADAPTERS = {
  default: {
    mount: async (options: MountOptions = {}): Promise<Mounted> => {
      const kind = options.kind ?? 'restock'
      const wrapper = await mountSuspended(NotifyMe, {
        props: {
          'productId': 3,
          'productName': 'Γλάστρα',
          'soldOut': true,
          'priceDrop': kind === 'price_drop',
          'currentPrice': options.currentPrice ?? 20,
          'open': true,
          kind,
          'onUpdate:open': (open: boolean) => wrapper.setProps({ open }),
          'onUpdate:kind': (next: ProductAlertKindEnum) => wrapper.setProps({ kind: next }),
        },
        global: { stubs: { UModal: Dialog } },
        route: false,
      })
      await flushPromises()
      return wrapper
    },
    submit: async (wrapper: Mounted, fill: Record<string, string> = {}) => {
      for (const [selector, value] of Object.entries(fill)) {
        await wrapper.get(`[data-testid="modal"] ${selector}`).setValue(value)
      }
      // The footer's button submits the form through its `form` attribute;
      // happy-dom does not run that default action, so the form is
      // submitted the way the click would (the wiring has its own test).
      await wrapper.get('form').trigger('submit')
      await flushPromises()
    },
    formShown: (wrapper: Mounted) => wrapper.find('form').exists(),
    copy: {
      created: 'Θα σε ειδοποιήσουμε μόλις είναι ξανά διαθέσιμο',
      conflict: 'Έχεις ήδη ενεργή ειδοποίηση για αυτό',
      aboveCurrent: 'Η επιθυμητή τιμή πρέπει να είναι κάτω από τη σημερινή.',
      activeTarget: () => `Θα σε ειδοποιήσουμε μόλις φτάσει στα ${useNuxtApp().$i18n.n(15, 'currency')} ή χαμηλότερα.`,
    },
  },
  webside: {
    mount: async (options: MountOptions = {}): Promise<Mounted> => {
      const wrapper = await mountSuspended(WebsideNotifyMe, {
        props: { productId: 3, ...options },
        global: { stubs: { UModal } },
        route: false,
      })
      await flushPromises()
      return wrapper
    },
    submit: async (wrapper: Mounted, fill: Record<string, string> = {}) => {
      await wrapper.get('[data-testid="trigger"] button').trigger('click')
      for (const [selector, value] of Object.entries(fill)) {
        await wrapper.get(`[data-testid="modal"] ${selector}`).setValue(value)
      }
      await wrapper.get('[data-testid="modal"] form').trigger('submit')
      await flushPromises()
    },
    formShown: (wrapper: Mounted) => wrapper.find('[data-testid="trigger"]').exists(),
    copy: {
      created: 'Η ειδοποίηση ενεργοποιήθηκε',
      conflict: 'Έχεις ήδη ενεργή ειδοποίηση',
      aboveCurrent: 'Η επιθυμητή τιμή πρέπει να είναι μικρότερη από την τρέχουσα.',
      activeTarget: () => 'Θα σε ειδοποιήσουμε μόλις η τιμή φτάσει στα 15 € ή χαμηλότερα.',
    },
  },
}

/**
 * A product's "notify me" alerts (`useProductAlert`, shared by both
 * trees): a guest subscribes by email, a signed-in shopper's active alert
 * replaces the form and can be turned off, a price target must be below
 * today's price, a 409 means the alert exists already.
 */
describe.each(trees(NotifyMe, WebsideNotifyMe))('$tree Product/NotifyMe', ({ tree }) => {
  const adapter = ADAPTERS[tree]
  const posts = () => api.callsTo(ALERTS).filter(call => call.options?.method === 'POST')
  const lookups = () => api.callsTo(ALERTS).filter(call => call.options?.method === 'GET')
  const signIn = () => {
    session.loggedIn.value = true
    session.user.value = { id: 7, email: 'maria@example.com' }
  }
  const modalText = (wrapper: Mounted) => wrapper.get('[data-testid="modal"]').text()

  beforeEach(() => {
    clearNuxtData()
    session.loggedIn.value = false
    session.user.value = null
    api.routes({ [ALERTS]: (_url: string, options?: { method?: string }) => (options?.method === 'GET' ? page([]) : makeAlert()) })
  })

  it('subscribes a guest by email, confirms it and closes the form, without looking up alerts', async () => {
    const wrapper = await adapter.mount()

    await adapter.submit(wrapper, { 'input[type="email"]': 'guest@example.com' })

    expect(posts()).toEqual([{
      url: ALERTS,
      options: expect.objectContaining({ body: { kind: 'restock', product: 3, email: 'guest@example.com' } }),
    }])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: adapter.copy.created, color: 'success' }))
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
    // A guest cannot be identified without their email: no lookup.
    expect(lookups()).toHaveLength(0)
  })

  it('refuses a guest without a valid email', async () => {
    const wrapper = await adapter.mount()

    await adapter.submit(wrapper, { 'input[type="email"]': 'not-an-email' })

    expect(posts()).toHaveLength(0)
    expect(modalText(wrapper)).toContain(useNuxtApp().$i18n.t('validation.email.valid'))
  })

  it('looks up a signed-in shopper\'s alerts once and subscribes them without sending an email', async () => {
    signIn()
    const wrapper = await adapter.mount()

    expect(lookups()).toEqual([{
      url: ALERTS,
      options: expect.objectContaining({ query: { product: 3, isActive: true, pageSize: 2 } }),
    }])

    await adapter.submit(wrapper)

    expect(posts()).toHaveLength(1)
    expect(posts()[0]!.options.body).toEqual({ kind: 'restock', product: 3 })
  })

  it('shows an active alert instead of the form, and turns it off', async () => {
    signIn()
    let active = [makeAlert()]
    api.routes({
      [ALERTS]: () => page(active),
      [`${ALERTS}/5`]: () => { active = [] },
    })
    const wrapper = await adapter.mount()

    expect(wrapper.text()).toContain('Η ειδοποίηση διαθεσιμότητας είναι ενεργή')
    expect(adapter.formShown(wrapper)).toBe(false)

    await wrapper.findAll('button').find(button => button.text() === 'Απενεργοποίηση ειδοποίησης')!.trigger('click')
    await flushPromises()

    expect(api.callsTo(`${ALERTS}/5`)).toEqual([
      { url: `${ALERTS}/5`, options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Η ειδοποίηση απενεργοποιήθηκε', color: 'success' }))
    // Re-read, so the form comes back.
    expect(lookups()).toHaveLength(2)
    expect(adapter.formShown(wrapper)).toBe(true)
  })

  it('says why an alert could not be turned off, and keeps it', async () => {
    signIn()
    api.routes({
      [ALERTS]: () => page([makeAlert()]),
      [`${ALERTS}/5`]: failWith(500, { detail: 'Η υπηρεσία δεν απαντά.' }),
    })
    const wrapper = await adapter.mount()

    await wrapper.findAll('button').find(button => button.text() === 'Απενεργοποίηση ειδοποίησης')!.trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error', description: 'Η υπηρεσία δεν απαντά.' }))
    expect(lookups()).toHaveLength(1)
  })

  it('treats a 409 as "already subscribed" and re-reads the alerts', async () => {
    signIn()
    api.routes({ [ALERTS]: (_url: string, options?: { method?: string }) => (options?.method === 'GET' ? page([]) : failWith(409)()) })
    const wrapper = await adapter.mount()

    await adapter.submit(wrapper)

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: adapter.copy.conflict, color: 'warning' }))
    expect(lookups()).toHaveLength(2)
  })

  it('reports any other failure with the reason Django gives and keeps the form open', async () => {
    api.routes({ [ALERTS]: failWith(500, { detail: 'Η υπηρεσία δεν απαντά.' }) })
    const wrapper = await adapter.mount()

    await adapter.submit(wrapper, { 'input[type="email"]': 'guest@example.com' })

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error', description: 'Η υπηρεσία δεν απαντά.' }))
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
  })

  describe('price drop', () => {
    it('refuses a target above the current price', async () => {
      const wrapper = await adapter.mount({ kind: 'price_drop', currentPrice: 20 })

      await adapter.submit(wrapper, { 'input[type="email"]': 'guest@example.com', 'input[type="number"]': '25' })

      expect(posts()).toHaveLength(0)
      expect(modalText(wrapper)).toContain(adapter.copy.aboveCurrent)
    })

    it('subscribes with the target price', async () => {
      const wrapper = await adapter.mount({ kind: 'price_drop', currentPrice: 20 })

      await adapter.submit(wrapper, { 'input[type="email"]': 'guest@example.com', 'input[type="number"]': '15.5' })

      expect(posts()).toHaveLength(1)
      expect(posts()[0]!.options.body).toEqual({ kind: 'price_drop', product: 3, email: 'guest@example.com', targetPrice: 15.5 })
    })

    it('names the target of an active price alert', async () => {
      signIn()
      api.routes({ [ALERTS]: () => page([makeAlert({ kind: 'price_drop', targetPrice: 15 })]) })

      const wrapper = await adapter.mount({ kind: 'price_drop', currentPrice: 20 })

      expect(wrapper.text()).toContain(adapter.copy.activeTarget())
    })

    it('asks only for the alert of its own kind', async () => {
      signIn()
      api.routes({ [ALERTS]: () => page([makeAlert({ kind: 'price_drop', targetPrice: 15 })]) })

      const wrapper = await adapter.mount({ kind: 'restock' })

      expect(wrapper.text()).not.toContain('Η ειδοποίηση τιμής είναι ενεργή')
      expect(adapter.formShown(wrapper)).toBe(true)
    })
  })

  describe.runIf(tree === 'default')('the kind chooser', () => {
    it('submits the form from a footer button outside it, through its form attribute', async () => {
      const wrapper = await ADAPTERS.default.mount()

      const button = wrapper.get('[data-testid="footer"]').findAll('button').find(candidate => candidate.text() === 'Δημιουργία ειδοποίησης')!

      expect(button.attributes('type')).toBe('submit')
      expect(button.attributes('form')).toBe(wrapper.get('form').attributes('id'))
    })

    it('offers the choice of kind only when both apply', async () => {
      const one = await ADAPTERS.default.mount({ kind: 'restock' })
      expect(one.find('[role="radiogroup"]').exists()).toBe(false)

      const both = await mountSuspended(NotifyMe, {
        props: { productId: 3, productName: 'Γλάστρα', soldOut: true, priceDrop: true, currentPrice: 20, open: true, kind: 'restock' },
        global: { stubs: { UModal: Dialog } },
        route: false,
      })
      await flushPromises()
      expect(both.findAll('[role="radio"]').map(radio => radio.element.closest('[data-slot="item"]')!.textContent!.trim()))
        .toEqual(['Επαναφορά αποθέματος', 'Πτώση τιμής'])
    })
  })
})
