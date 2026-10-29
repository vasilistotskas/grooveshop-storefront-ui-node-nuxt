/**
 * The blog's categories for the rail band (`PageSection/BlogCategories.vue`
 * and the tenants' own): the band owns the request, because the band decides
 * whether to draw at all, and a band with no categories paints nothing.
 *
 * Gated on the `blog` feature, and the REQUEST is what is gated: a store
 * with the blog off fetches nothing. The list is `useBlogCategories`'s, one entry for
 * every reader; the band slices it to its page size.
 */
export async function useBlogCategoryRail(options: { pageSize: MaybeRefOrGetter<number> }) {
  const { request, categories: all } = useBlogCategories()
  await request

  const categories = computed(() => all.value.slice(0, toValue(options.pageSize)))
  const hasCategories = computed(() => categories.value.length > 0)

  return { categories, hasCategories }
}
