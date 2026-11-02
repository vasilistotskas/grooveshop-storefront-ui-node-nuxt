/**
 * Whether this page is the page builder's rather than the store's: the
 * editor, or a store page drawn as its preview (`builderSurfaceOf`). Read
 * once, from the address the page was loaded at: the server's request and
 * the browser's first URL are the same address, so both sides agree without
 * a payload, and a later client navigation cannot change what the page is.
 *
 * Neither surface is a shopper's visit: `app.vue` sets up no analytics,
 * pixels or consent banner on it, it is never indexed, and the plugins that
 * report on a visit (`attribution`, `web-vitals`) skip it. `pre`, so every
 * other plugin can read it; it reads nothing but the address.
 */
export default defineNuxtPlugin({
  name: 'builder-surface',
  enforce: 'pre',
  setup() {
    const url = useRequestURL()
    return { provide: { builderSurface: builderSurfaceOf(`${url.pathname}${url.search}`) } }
  },
})
