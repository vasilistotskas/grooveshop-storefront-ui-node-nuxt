import type { Component } from 'vue'

/**
 * The two component trees a storefront renders: the platform defaults
 * under `app/components/**`, and the frozen webside.gr tree under
 * `app/components/variants/webside/**`, auto-imported with the `Webside`
 * prefix (`nuxt.config.ts`; `.claude/rules/ui-and-pages.md`, "The frozen
 * `webside` tree").
 */
export type Tree = 'default' | 'webside'

/** One tree's implementation of a component, as `describe.each` receives it. */
export interface TreeImpl {
  tree: Tree
  /**
   * The component under test in this tree. Typed as a plain `Component`:
   * the two SFCs' own types make a union that `mountSuspended`'s
   * overloads cannot resolve (TS2590, "union type too complex").
   */
  C: Component
  /**
   * The auto-import prefix of this tree's OWN components: a frozen
   * component renders `<WebsideCheckoutSelectedBoxNowLocker>` where the
   * default renders `<CheckoutSelectedBoxNowLocker>`. Shared components
   * (`U*`, `ImgWithFallback`, the locker pickers, …) carry no prefix in
   * either tree.
   */
  prefix: '' | 'Webside'
  /** `name` as this tree's template references it — for `stubs` and `findComponent({ name })`. */
  own: (name: string) => string
}

/**
 * Run one spec body over both trees:
 *
 * ```ts
 * describe.each(trees(StepShipping, WebsideStepShipping))('$tree Checkout/StepShipping', ({ tree, C, own }) => {
 *   it('…', async () => {
 *     const wrapper = await mountSuspended(C, { global: { stubs: { [own('CheckoutSelectedGenericLocker')]: true } } })
 *   })
 *   it.runIf(tree === 'default')('hides the ACS chip for a tenant without ACS', …)
 * })
 * ```
 *
 * A component whose two copies share their `<script>` logic gets ONE body,
 * so a lockstep fix and its test land once, and a copy that drifts shows
 * up as a failing `webside` row. Where the copies genuinely differ, the
 * case says so with `it.runIf(tree === …)` or a per-tree expectation — and
 * names the difference. When the default is rewritten for real, fork the
 * body into a default-only suite and keep the webside row pinned.
 */
export function trees(defaultImpl: Component, websideImpl: Component): [TreeImpl, TreeImpl] {
  return [
    { tree: 'default', C: defaultImpl, prefix: '', own: name => name },
    { tree: 'webside', C: websideImpl, prefix: 'Webside', own: name => `Webside${name}` },
  ]
}
