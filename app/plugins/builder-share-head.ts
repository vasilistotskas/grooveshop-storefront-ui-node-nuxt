/**
 * A share-preview link names no address in its head: the path carries the
 * link's token, so the canonical, the hreflang alternates and `og:url` are
 * taken out (`hideAddressTags`) whatever produced them. The page is noindex
 * either way (`app/pages/_builder-preview/[token].vue`).
 *
 * Only on that surface, so no store page pays for it.
 */
export default defineNuxtPlugin({
  name: 'builder-share-head',
  setup() {
    if (useBuilderSurface() !== 'share') return
    hideAddressTags(injectHead())
  },
})
