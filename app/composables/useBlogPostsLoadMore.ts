/**
 * The posts of a blog band that goes on with its own list: the ones the page
 * route read, and the following pages of the SAME rule on demand.
 *
 * The band's `posts` is what its descriptor lists now (`ResolvedQuery`); its
 * `limit` is the size of a page. Each further page is read through the
 * public `/api/blog/posts` route with the question the server asked for the
 * first (`blogPostListQuery`, shared with `server/utils/builderData`), so the
 * pages are the pages of the same list in the same order. A hand-picked list
 * has nothing more to load.
 *
 * Shared by every drawing of the band (the default's, webside's and the
 * tenants' own), which each pass their own words and draw the button
 * (`PageSection/BlogPostsLoadMore`), so the request is decided once.
 *
 * What the shopper sees stays true: a failed page keeps what is shown and
 * leaves the button to try again, a post a page repeats (the list moved
 * between two reads) is shown once, and the button goes when the list has no
 * more.
 */
export function useBlogPostsLoadMore(options: {
  /** What the band lists, as the page route resolved it. */
  posts: () => ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>
  /** The block's `loadMore` setting. */
  enabled: () => boolean
  /** The headline of the toast a failed page shows. */
  errorTitle: () => string
}) {
  const { notify } = useApiError()
  const { locale } = useNuxtApp().$i18n

  // The first page is the band's own; the pages after it are `more`.
  const more = ref<BlogPost[]>([])
  const nextPage = ref(2)
  const total = ref<number>()
  const finished = ref(false)
  const loading = ref(false)
  /** How many posts the last read added: what a screen reader is told. */
  const added = ref(0)

  const items = computed(() => [...options.posts().items, ...more.value])

  const filter = computed(() => {
    const { descriptor } = options.posts()
    return descriptor.mode === 'filter' ? descriptor : undefined
  })

  const hasMore = computed(() =>
    options.enabled()
    && filter.value !== undefined
    && options.posts().status === 'ok'
    && !finished.value
    && items.value.length < (total.value ?? options.posts().total),
  )

  // A band that is read again (another page, the page's data refreshed) is a
  // new list: what was added to the old one does not belong to it.
  watch(() => options.posts(), () => {
    more.value = []
    nextPage.value = 2
    total.value = undefined
    finished.value = false
    added.value = 0
  })

  async function loadMore() {
    const rule = filter.value
    if (!rule || !hasMore.value || loading.value) return

    loading.value = true
    added.value = 0
    try {
      const response = await $api<PaginatedBlogPostList>('/api/blog/posts', {
        query: { ...blogPostListQuery(rule), page: nextPage.value, languageCode: locale.value },
      })
      const shown = new Set(items.value.map(post => post.id))
      const fresh = response.results.filter(post => !shown.has(post.id) && shown.add(post.id))
      more.value = [...more.value, ...fresh]
      added.value = fresh.length
      nextPage.value += 1
      total.value = response.count
      finished.value = response.results.length === 0 || !response.links?.next
    }
    catch (error) {
      log.error({ action: 'blogPosts:loadMore', error })
      notify('blog-posts:load-more', error, { title: options.errorTitle() })
    }
    finally {
      loading.value = false
    }
  }

  return { items, hasMore, loading, added, loadMore }
}
