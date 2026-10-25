import * as z from 'zod'

/**
 * A post's comment section, apart from its drawing: the first page of
 * approved top-level comments (none asked for when the store has comments
 * off), the next pages on demand, their like state, and the add-a-comment
 * form. Shared by every drawing of the section (`Blog/Post/Comments` and
 * the tenants' own); each passes its own `t`, so the words stay in its own
 * messages.
 *
 * Everything that belongs to the component (watchers, `onMounted`, the
 * request) is registered before the one `await`, at the end: after an
 * await a composable has no component instance.
 */
export async function useBlogPostComments(options: {
  blogPostId: Ref<string>
  paginationType: Ref<PaginationType>
  pageSize: Ref<number>
  t: ReturnType<typeof useI18n>['t']
  onReplyAdd: (comment: BlogComment) => void
}) {
  const { blogPostId, paginationType, pageSize, t } = options

  // One gate here covers the whole comments surface under every post, and
  // the request below: a store without comments is not asked for any.
  const blogCommentsEnabled = useStoreFeature('blogComments')

  const { locale } = useI18n()
  const toast = useToast()
  const { notify } = useApiError()
  const route = useRoute()
  const { loggedIn, user } = useUserSession()
  const { loadLikedComments } = useUserStore()
  const cursorState = useState<CursorState>('cursor-state')

  const cursor = computed(
    () => cursorState.value[PaginationCursorStateEnum.BLOG_POST_COMMENTS],
  )

  const isOpen = ref(false)
  const allComments = ref<BlogComment[]>([])
  const isLoadingMore = ref(false)

  const request = useApi(
    `/api/blog/posts/${blogPostId.value}/comments`,
    {
      key: `comments${blogPostId.value}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        cursor: cursor,
        parent_Isnull: true,
        paginationType: paginationType,
        pageSize: pageSize,
        languageCode: locale,
        approved: true,
      },
      // Off, the comments are gone: none fetched, so none reach the page
      // payload behind the hidden section (Django answers 404 too). Not
      // `immediate`, which skips only the first fetch: a change to the
      // query's refs (the locale, the cursor) still refetched.
      enabled: blogCommentsEnabled,
    },
  )
  const { data: comments, status, refresh } = request

  const pagination = computed(() => {
    if (!comments.value?.count) return
    return usePagination<BlogComment>(comments.value)
  })

  const isLoading = computed(() => status.value === 'pending')
  const hasComments = computed(() => allComments.value.length > 0)
  const showCommentsList = computed(() => !isLoading.value && hasComments.value)
  const showEmptyState = computed(() => !isLoading.value && !hasComments.value)

  const hasNextPage = computed(() => {
    return comments.value?.links?.next && !isLoading.value
  })

  const showLoadMoreButton = computed(() => {
    return hasNextPage.value && hasComments.value
  })

  const loadMoreComments = async () => {
    if (!hasNextPage.value || isLoadingMore.value) return

    const nextUrl = comments.value?.links?.next
    if (!nextUrl) return

    isLoadingMore.value = true

    try {
      // `nextUrl` is an absolute Django URL (DRF's build_absolute_uri()) — only
      // its pagination query params are reusable; the request itself must go
      // through the Nuxt proxy route, never straight to Django.
      const query = Object.fromEntries(new URL(nextUrl).searchParams)
      const response = await $api<PaginatedBlogCommentList>(
        `/api/blog/posts/${blogPostId.value}/comments`,
        { query },
      )

      if (response?.results?.length) {
        const newComments = response.results.filter(
          (newComment: BlogComment) => !allComments.value.some(existingComment => existingComment.id === newComment.id),
        )

        allComments.value = [...allComments.value, ...newComments].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        // The `commentIds` watcher loads this page's like state.
        comments.value = response
      }
    }
    catch (error) {
      log.error({ action: 'comments:loadMore', error })
      notify('blog-comments:load', error, { title: t('load.error') })
    }
    finally {
      isLoadingMore.value = false
    }
  }

  const commentIds = computed(() => {
    if (!comments.value) return []
    return comments.value?.results?.map(comment => comment.id) || []
  })

  // Load the like state of every page of comments as it arrives — the first
  // one, a loaded next page, a refetch. `commentIds` is empty during setup
  // (allComments is filled by the `comments` watcher below), so this must
  // react to the ids rather than run once — otherwise the first page never
  // gets its like state and toggling silently removes an existing like.
  watch(commentIds, ids => loadLikedComments(ids), { immediate: import.meta.client })

  const onReplyAdd = async (data: BlogComment) => {
    options.onReplyAdd(data)
  }

  const addCommentFormSchema: DynamicFormSchema = {
    fields: [
      {
        label: '',
        id: `content-${blogPostId.value}`,
        name: 'content',
        as: 'textarea',
        rules: z.string({
          error: issue => issue.input === undefined ? t('validation.required') : undefined,
        }).max(1000),
        autocomplete: 'on',
        condition: null,
        disabledCondition: null,
        readonly: false,
        required: true,
        placeholder: t('reply.placeholder'),
        type: 'text',
        ui: {
          root: 'w-full',
        },
      },
    ],
  }

  async function onAddCommentSubmit(values: Record<string, any>) {
    try {
      const created = await $api('/api/blog/comments', {
        method: 'POST',
        body: {
          post: Number(blogPostId.value),
          user: Number(user?.value?.id),
          translations: {
            [locale.value]: {
              content: values.content,
            },
          },
        },
      })
      options.onReplyAdd(created)
      toast.add({
        title: t('add.success'),
        color: 'success',
      })
    }
    catch (error) {
      log.error({ action: 'comments:add', error })
      notify('blog-comments:add', error, { title: t('add.error') })
      return
    }
    // A refetch never rejects: `useApi` keeps its error in `error`.
    await refresh()
  }

  const scrollToComments = () => {
    if (window.location.hash === `#${BLOG_POST_COMMENTS_ID}`) {
      nextTick(() => {
        const commentsElement = document.getElementById(BLOG_POST_COMMENTS_ID)
        if (commentsElement) {
          commentsElement.scrollIntoView({ behavior: 'smooth' })
        }
      })
    }
  }

  // `enabled` blocks these refreshes too while the store has comments off.
  watch(
    () => cursorState.value[PaginationCursorStateEnum.BLOG_POST_COMMENTS],
    async () => {
      await refresh()
    },
  )

  watch(
    comments,
    (newValue) => {
      if (newValue && newValue.results?.length) {
        const newComments = newValue.results.filter(
          newComment => !allComments.value.some(existingComment => existingComment.id === newComment.id),
        )
        allComments.value = [...allComments.value, ...newComments].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
      }
    },
    { deep: true, immediate: true },
  )

  watch(
    () => route.query.comment_page,
    async () => {
      await refresh()
    },
  )

  onMounted(() => {
    scrollToComments()
  })

  await request

  return {
    blogCommentsEnabled,
    loggedIn,
    isOpen,
    allComments,
    isLoading,
    isLoadingMore,
    pagination,
    showCommentsList,
    showEmptyState,
    showLoadMoreButton,
    loadMoreComments,
    onReplyAdd,
    addCommentFormSchema,
    onAddCommentSubmit,
  }
}
