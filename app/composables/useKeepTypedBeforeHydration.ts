/** The input types a visitor types text into. */
const TYPED_INPUTS = new Set(['text', 'email', 'search', 'tel', 'url', 'number', 'password'])

/**
 * Keeps what a visitor typed into a server-rendered text field before the
 * component drawing it hydrated.
 *
 * A lazily hydrated component (a builder section under `hydrateOnVisible`,
 * a `Lazy…` element with `hydrate-on-visible`) is live HTML for a while
 * before Vue takes it over, and a visitor can type into its fields. When
 * it hydrates, Vue patches every `<input>`'s `value` from the vnode (its
 * hydration force-patches `value` on inputs), so a field bound with
 * `:value`, as Nuxt UI's `UInput` binds it, is emptied back to the
 * model's empty string. Vue's own `v-model` keeps typed text only on a
 * plain `text` input or a textarea, and only for `v-model` itself.
 *
 * So, just before the component's tree hydrates (`onBeforeMount`, when
 * its root is the server's element), every text input inside it whose
 * `name` is a key of `state` and whose value differs from the one the
 * server rendered is read; once it has hydrated (`onMounted`) those values
 * are written into `state`, which draws them back. Writing after
 * hydration, as Vue's `v-model` does, keeps the hydration itself free of a
 * mismatch: an input's is checked against its `value` attribute, which
 * typing does not change. A component mounted in the browser has no
 * server element and keeps nothing.
 *
 * Call it in setup before any `await`, with the reactive object the
 * form's inputs are bound to.
 */
export function useKeepTypedBeforeHydration(state: Record<string, unknown>): void {
  const instance = getCurrentInstance()
  let typed: Array<[string, string]> = []

  onBeforeMount(() => {
    const root = instance?.vnode.el
    if (!(root instanceof Element)) return
    typed = [...root.querySelectorAll<HTMLInputElement>('input[name]')]
      .filter(field => TYPED_INPUTS.has(field.type) && field.name in state && field.value !== field.defaultValue)
      .map(field => [field.name, field.value])
  })

  onMounted(() => {
    for (const [name, value] of typed) state[name] = value
    typed = []
  })
}
