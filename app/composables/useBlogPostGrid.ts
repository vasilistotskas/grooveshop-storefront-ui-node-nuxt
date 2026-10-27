/**
 * What a list of blog posts does with the page `useBlogListing` fetched:
 * the posts on screen (a page replaces the last one; in cursor mode each
 * page is appended), whether there is anything to show, the featured post
 * that opens the unfiltered first page, and how the first cards load their
 * images.
 *
 * Shared by every drawing of the list (`Blog/Posts/List.vue` and the
 * tenants' own). Call it from a `<script setup>`, after `useBlogListing`.
 */
export function useBlogPostGrid(options: {
  posts: MaybeRefOrGetter<{ results?: BlogPost[] } | null | undefined>
  status: MaybeRefOrGetter<string>
  paginationType: MaybeRefOrGetter<PaginationType>
  isFirstPage: MaybeRefOrGetter<boolean>
  isFiltered: MaybeRefOrGetter<boolean>
  /**
   * The list is the page's above-the-fold content (the /blog page): its
   * first card's image is the LCP, so it is eager-loaded and preloaded.
   * Below the fold those hints steal bandwidth from the real LCP.
   */
  eagerFirstImages: MaybeRefOrGetter<boolean>
}) {
  const cursorState = useState<CursorState>('cursor-state')

  const paginationType = computed(() => toValue(options.paginationType))
  const allPosts = shallowRef<BlogPost[]>([])

  const showResults = computed(() => {
    if (paginationType.value === PaginationTypeEnum.CURSOR) {
      return allPosts.value.length
    }
    return toValue(options.status) !== 'pending' && allPosts.value.length
  })

  // The featured post opens the unfiltered first page, as the board does;
  // it is one of the page's own posts, so it costs no request.
  const featuredPost = computed(() =>
    toValue(options.isFirstPage) && !toValue(options.isFiltered) && paginationType.value !== PaginationTypeEnum.CURSOR
      ? allPosts.value.find(post => post.featured)
      : undefined,
  )
  const gridPosts = computed(() =>
    featuredPost.value ? allPosts.value.filter(post => post.id !== featuredPost.value!.id) : allPosts.value,
  )

  const imgLoading = (index: number) => {
    if (toValue(options.eagerFirstImages) && index < 3) {
      return 'eager'
    }
    return 'lazy'
  }

  const imgFetchPriority = (index: number) => {
    if (toValue(options.eagerFirstImages) && index === 0) {
      return 'high'
    }
    return 'auto'
  }

  const shouldPreload = (index: number) => {
    return toValue(options.eagerFirstImages) && index === 0
  }

  watch(
    paginationType,
    (newType, oldType) => {
      if (oldType !== newType) {
        allPosts.value = []

        if (oldType === PaginationTypeEnum.CURSOR) {
          cursorState.value[PaginationCursorStateEnum.BLOG_POSTS] = ''
        }
      }
    },
    { immediate: false },
  )

  watch(
    () => toValue(options.posts)?.results,
    (newResults) => {
      if (!newResults) return

      if (paginationType.value === PaginationTypeEnum.CURSOR) {
        // Cursor mode appends: an empty page adds nothing.
        if (!newResults.length) return
        const postsMap = new Map(allPosts.value.map(post => [post.id, post]))
        newResults.forEach(newPost => postsMap.set(newPost.id, newPost))
        allPosts.value = [...postsMap.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
      else {
        // A page replaces the last one — an empty answer included, or a
        // search that finds nothing would keep showing the previous posts.
        allPosts.value = [...newResults].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    },
    { immediate: true },
  )

  return {
    allPosts,
    showResults,
    featuredPost,
    gridPosts,
    imgLoading,
    imgFetchPriority,
    shouldPreload,
  }
}
