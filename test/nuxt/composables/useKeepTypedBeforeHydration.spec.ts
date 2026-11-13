import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { Suspense, createSSRApp, defineAsyncComponent, defineComponent, h, reactive } from 'vue'
import type { HydrationStrategy, VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'

/**
 * A form that hydrates lazily, as a builder section under
 * `hydrateOnVisible` or a `hydrate-on-visible` element does: the server's
 * HTML is live, a visitor types into it, and only then does Vue take it
 * over. Its fields are bound with `:value`, as Nuxt UI's `UInput` binds
 * them, which is what Vue's hydration overwrites. Its root is another
 * component, as the newsletter band's is (`PageSectionBand`), and its
 * setup may await, as every newsletter form's does.
 */
let state: { email: string, phone: string, consent: boolean }

const Band = defineComponent({
  setup: (_, { slots }) => () => h('section', slots.default?.()),
})

const fields = () => [
  h('input', { name: 'email', type: 'email', value: state.email, onInput: (event: Event) => { state.email = (event.target as HTMLInputElement).value } }),
  h('input', { name: 'phone', type: 'tel', value: state.phone, onInput: (event: Event) => { state.phone = (event.target as HTMLInputElement).value } }),
  h('input', { name: 'consent', type: 'checkbox', checked: state.consent }),
]

const Form = defineComponent({
  setup() {
    state = reactive({ email: '', phone: '', consent: false })
    useKeepTypedBeforeHydration(state)
    return () => h(Band, () => h('form', fields()))
  },
})

const AwaitingForm = defineComponent({
  async setup() {
    state = reactive({ email: '', phone: '', consent: false })
    useKeepTypedBeforeHydration(state)
    await Promise.resolve()
    return () => h(Band, () => h('form', fields()))
  },
})

/** Server-renders `form` lazily hydrated, lets `type` fill its fields, then hydrates it. */
async function typeThenHydrate(type: (form: HTMLFormElement) => void, form = Form) {
  let hydrateNow: () => void = () => {}
  const strategy: HydrationStrategy = (hydrate) => {
    hydrateNow = hydrate
  }
  const app = () => createSSRApp({
    render: (): VNode => h(Suspense, null, () => h(defineAsyncComponent({ loader: () => Promise.resolve(form), hydrate: strategy }))),
  })
  const container = document.createElement('div')
  container.innerHTML = await renderToString(app())
  document.body.append(container)

  app().mount(container)
  await flushPromises()
  type(container.querySelector('form')!)
  hydrateNow()
  await flushPromises()
  return container.querySelector('form')!
}

describe('useKeepTypedBeforeHydration', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it.each([
    ['a setup that returns at once', Form],
    ['a setup that awaits', AwaitingForm],
  ])('keeps what was typed into a lazily hydrated form, in its fields and its state, for %s', async (_case, component) => {
    const form = await typeThenHydrate((form) => {
      form.querySelector<HTMLInputElement>('[name="email"]')!.value = 'ena@example.gr'
      form.querySelector<HTMLInputElement>('[name="phone"]')!.value = '+30 210 0000000'
    }, component)

    expect(form.querySelector<HTMLInputElement>('[name="email"]')!.value).toBe('ena@example.gr')
    expect(form.querySelector<HTMLInputElement>('[name="phone"]')!.value).toBe('+30 210 0000000')
    expect({ ...state }).toEqual({ email: 'ena@example.gr', phone: '+30 210 0000000', consent: false })
  })

  it('leaves a form nobody typed into as the server drew it', async () => {
    const form = await typeThenHydrate(() => {})

    expect(form.querySelector<HTMLInputElement>('[name="email"]')!.value).toBe('')
    expect({ ...state }).toEqual({ email: '', phone: '', consent: false })
  })

  it('keeps nothing for a form mounted in the browser, which no one could type into before', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    createSSRApp(Form).mount(container)
    await flushPromises()

    expect({ ...state }).toEqual({ email: '', phone: '', consent: false })
  })
})
