/** A page setting that is text, or `''`: the page's SEO copy, in the page's language. */
function settingText(page: BuilderPage | null, key: string): string {
  const value = page?.settings?.[key]
  return typeof value === 'string' ? value : ''
}

/**
 * A page of the store as its published release has it: its sections, ready
 * for `PageSectionRenderer`, and its own SEO copy.
 *
 * `page` is `null` when the store has not built the page (the route answers
 * `{ page: null }` for that, which is not an error); a backend outage sets
 * `error` instead. Callers that must tell a page that does not exist from
 * one that cannot be fetched read both.
 *
 * `await` is load-bearing, not stylistic. On the server Nuxt registers
 * useFetch's promise with `onServerPrefetch` and lets setup continue
 * synchronously (see nuxt/dist/app/composables/asyncData.js): it is awaited
 * before RENDER, not before the next statement. Callers that branch on
 * `page` or `error` right after the call would read `null` on every server
 * render. Awaiting suspends setup the way every other data-driven page in
 * `app/pages/**` does.
 */
export async function useBuilderPage(
  pageKey: string,
  options: {
    /**
     * Where the page is drawn. A page that LEADS its route (`top`, the
     * default) speaks for it: its SEO copy is the route's title and
     * description. One drawn `below-content` is bands under another page's
     * own content (an article's): it carries sections only, and must not
     * overwrite the head that page set.
     */
    placement?: PageSectionPlacement
  } = {},
) {
  // The page's props are resolved per language by Django, so the language
  // has to travel with the request AND be part of the payload key, or /en
  // reuses the Greek copy cached under a language-less key. `useI18n()`, not
  // `useNuxtApp().$i18n`: every caller is a component's `setup()`, where the
  // composable is valid, and `$i18n` can be undefined there (the module
  // injects it from its own setup plugin).
  const { locale } = useI18n({ useScope: 'global' })
  const { data, status, error } = await useApi<BuilderPageResponse>(
    `/api/builder/pages/${pageKey}`,
    { key: () => `builder-page-${pageKey}-${locale.value}` },
  )

  // On the editor's preview, and on a share link, the page is the one being edited (or shared), once the
  // preview has drawn it (`useBuilderCanvasPreview`). Until then it is the
  // published page, or an empty one: a page the store has not published
  // yet is still drawn there, never answered as a 404.
  const preview = useBuilderCanvasPreview()
  const surface = useBuilderSurface()
  const canvas = surface === 'canvas' || surface === 'share'
  const page = computed<BuilderPage | null>(() => canvas
    ? builderCanvasPage(preview.value, pageKey) ?? data.value?.page ?? { sections: [] }
    : data.value?.page ?? null)
  const sections = computed(() => page.value?.sections ?? [])

  // The operator's own <title> and meta description. Django resolves them for
  // the page's language by laying that language's translations over the
  // default language's settings (`builder/published.py`, `localised`), so a
  // field not translated is the default language's text, and "empty" means
  // "not set in the default language either". An unset field emits NO tag at all, not a tag
  // with an empty value (which would still win the dedupe and then be
  // dropped, taking the page's own default with it). When set, the value must
  // beat those defaults even though this entry registers FIRST (every page
  // awaits this at the top of its setup, the page's and its sections'
  // `useSeoMeta` come later): unhead's dedupe keeps the entry with the LOWER
  // weight and only falls back to "later wins" at equal weight, so
  // `tagPriority: 'high'` is what makes the operator's value win. Keywords
  // are not emitted: search engines ignore them.
  const seoTitle = computed(() => settingText(page.value, 'seoTitle'))
  const seoDescription = computed(() => settingText(page.value, 'seoDescription'))
  useHead(() => {
    // Bands under another page speak for nothing but themselves.
    if (options.placement === 'below-content') return {}
    return {
      ...(seoTitle.value ? { title: seoTitle.value } : {}),
      meta: [
        ...(seoTitle.value ? [{ property: 'og:title', content: seoTitle.value }] : []),
        ...(seoDescription.value
          ? [
              { name: 'description', content: seoDescription.value },
              { property: 'og:description', content: seoDescription.value },
            ]
          : []),
      ],
    }
  }, { tagPriority: 'high' })

  // The page's h1 text where its body would otherwise draw the store's name
  // (`BUILDER_HEADING_DOCUMENTS`); empty when the page sets none.
  const heading = computed(() => settingText(page.value, 'heading'))

  return { page, sections, seoTitle, seoDescription, heading, status, error }
}
