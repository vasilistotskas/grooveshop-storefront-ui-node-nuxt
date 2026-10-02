/**
 * Draws the storefront in its design system — UNIVERSAL, like
 * `tenant-theme.ts`, and for the same reasons.
 *
 * The design is resolved per tenant (`resolveDesign`): every store gets
 * Groove Volt except the frozen webside tree, which must keep rendering
 * with the base stylesheet and app config it was captured against. So
 * Volt is applied per request rather than written into `app.config.ts`
 * or the `:root` tokens:
 *
 * - `data-design` on `<html>` switches on the Volt tokens in `main.css`;
 * - the Volt component theme is laid over this request's app config.
 *   On the server Nuxt clones the app config per request (`klona` in
 *   nuxt/src/app/config.ts), so the overlay never reaches another
 *   tenant's render; on the client it is applied from the hydrated
 *   tenant before the first render, so SSR and hydration agree.
 *
 * Nothing is applied without a resolved tenant — the "store not found"
 * page, and test harnesses that mount components with no tenant at
 * boot (`frozen-render.spec.ts` sets webside's after it).
 */
const DESIGN_UI: Record<StorefrontDesign, UiTheme> = {
  volt: VOLT_UI,
}

export default defineNuxtPlugin({
  name: 'design',
  enforce: 'pre',
  dependsOn: ['tenant'],
  setup() {
    const design = resolveDesign(useTenant().value?.schemaName)
    if (!design) return

    useHead({ htmlAttrs: { 'data-design': design } })
    applyUiTheme(useAppConfig().ui, DESIGN_UI[design])
  },
})
