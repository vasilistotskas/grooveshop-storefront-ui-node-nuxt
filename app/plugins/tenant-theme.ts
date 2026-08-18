/**
 * Per-tenant Nuxt UI semantic colors — UNIVERSAL, deliberately.
 *
 * On the server Nuxt clones ``appConfig`` per request (``klona`` in
 * nuxt/dist/app/config.js), so mutating it here is per-request-safe,
 * and Nuxt UI's colors plugin evaluates ``appConfig.ui.colors`` at
 * head-render time — AFTER plugins — emitting the full 50–950 scale
 * for the tenant's palette straight into the SSR HTML. The client run
 * assigns the same values from the hydrated tenant state, so the
 * recomputed ``#nuxt-ui-colors`` tag is identical: no flash, no
 * hydration mismatch. (The previous ``.client``-only version left SSR
 * on the platform palette — a visible repaint on every themed tenant.)
 *
 * Values are allowlist-checked against the Django ``TailwindColor``
 * choices; anything else is ignored.
 */
export default defineNuxtPlugin({
  name: 'tenant-theme',
  enforce: 'pre',
  dependsOn: ['tenant'],
  setup() {
    const tenant = useTenant()
    if (!tenant.value) return

    const appConfig = useAppConfig()
    const { primaryColor, neutralColor } = tenant.value
    if (primaryColor && TAILWIND_COLOR_ALLOWLIST.has(primaryColor)) {
      appConfig.ui.colors.primary = primaryColor
    }
    if (neutralColor && TAILWIND_COLOR_ALLOWLIST.has(neutralColor)) {
      appConfig.ui.colors.neutral = neutralColor
    }
  },
})
