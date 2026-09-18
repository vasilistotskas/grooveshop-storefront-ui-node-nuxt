/**
 * A few published posts, for a band on a page that is not `/blog`.
 *
 * The SECTION owns this rather than the rail component, because a band
 * with nothing to show must not render its heading either — and a
 * template ref cannot tell it that during server rendering.
 *
 * Gated on the tenant's blog flag, and the REQUEST is what is gated: a
 * store with the blog off fetches nothing.
 */
export async function useBlogRail(options: {
  count: MaybeRefOrGetter<number>
  categoryId?: MaybeRefOrGetter<number | undefined>
}) {
  const { locale } = useI18n()
  const tenantStore = useTenantStore()

  const count = computed(() => toValue(options.count))
  const categoryId = computed(() => toValue(options.categoryId))
  const enabled = tenantStore.blogEnabled

  const { data } = await useFetch('/api/blog/posts', {
    key: computed(
      () => `blog-rail-${count.value}-${categoryId.value ?? 'all'}-${locale.value}`,
    ),
    query: computed(() => ({
      pageSize: count.value,
      languageCode: locale.value,
      ordering: '-publishedAt',
      ...(categoryId.value ? { category: String(categoryId.value) } : {}),
    })),
    // Two blog bands can sit on one page; same key, one request.
    dedupe: 'defer',
    immediate: enabled,
    server: enabled,
  })

  const posts = computed<BlogPost[]>(() =>
    enabled ? (data.value?.results ?? []) : [],
  )

  return {
    posts,
    hasPosts: computed(() => posts.value.length > 0),
  }
}
