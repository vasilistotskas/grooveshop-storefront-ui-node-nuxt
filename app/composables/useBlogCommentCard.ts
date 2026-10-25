import * as z from 'zod'

/**
 * One comment card, apart from its drawing: its like count, its replies a
 * page at a time (fetched on first open, then by the replies' own cursor),
 * their like state, and the reply form. Shared by every drawing of the
 * card (`Blog/Post/Comments/Card` and the tenants' own); each passes its
 * own `t`, so the words stay in its own messages.
 */
export function useBlogCommentCard(options: {
  comment: Ref<BlogComment>
  depth: Ref<number>
  paginationType: Ref<PaginationType>
  pageSize: Ref<number>
  t: ReturnType<typeof useI18n>['t']
  onReplyAdd: (comment: BlogComment) => void
  onShowMoreReplies: (commentId: number) => void
}) {
  const { comment, depth, paginationType, pageSize, t } = options

  const toast = useToast()
  const { notify } = useApiError()
  const { locale } = useI18n()
  const { user, loggedIn } = useUserSession()
  const { loadLikedComments } = useUserStore()

  // The person, not the generated handle — see ``displayUserName``.
  const commenterName = computed(() => displayUserName(comment.value?.user))

  const showReplyForm = ref(false)
  const replies = ref<Pagination<BlogComment> | null>(null)
  const pending = ref(false)
  const repliesFetched = ref(false)
  const allReplies = ref<BlogComment[]>([])
  const showReplies = ref(false)
  const isLineHovered = ref(false)
  const likes = ref(comment.value.likesCount)

  const cursorState = useState<CursorState>('cursor-state')

  const cursorKey = computed<PaginationCursorStateType>(
    () => `${PaginationCursorStateEnum.BLOG_POST_COMMENTS}-${comment.value.id}`,
  )

  cursorState.value[cursorKey.value] = ''

  const cursor = computed(() => cursorState.value[cursorKey.value] ?? '')

  const route = useRoute()
  const blogPostId = computed(() => (route.params as Record<string, string>).id)

  const likeClicked = (event: { blogCommentId: number, liked: boolean }) => {
    if (event.liked) {
      likes.value++
    }
    else {
      likes.value--
    }
  }

  const replyCommentFormSchema: DynamicFormSchema = {
    fields: [
      {
        label: '',
        id: `content-${comment.value.id}`,
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

  const replyIds = computed(() => replies.value?.results?.map(reply => reply.id) ?? [])

  /** Load a page of replies and their like state; false when it failed. */
  const fetchReplies = async (cursorValue: string): Promise<boolean> => {
    pending.value = true
    try {
      replies.value = await $api(`/api/blog/comments/${comment.value.id}/replies`, {
        method: 'GET',
        query: {
          cursor: cursorValue,
          paginationType: paginationType.value,
          pageSize: pageSize.value,
          languageCode: locale.value,
        },
      })
      repliesFetched.value = true
    }
    catch (error) {
      log.error({ action: 'comments:replies', error })
      notify('blog-comment:replies', error, { title: t('load.error') })
      showReplies.value = false
      return false
    }
    finally {
      pending.value = false
    }
    await loadLikedComments(replyIds.value)
    return true
  }

  async function onReplySubmit(values: Record<string, any>) {
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
          parent: Number(comment.value.id),
        },
      })
      options.onReplyAdd(created)
      toast.add({
        title: t('add.success'),
        color: 'success',
      })
      showReplyForm.value = false
    }
    catch (error) {
      log.error({ action: 'comments:reply', error })
      notify('blog-comment:reply', error, { title: t('add.error') })
      return
    }
    if (await fetchReplies(cursor.value)) showReplies.value = true
  }

  const commentCardClass = computed(() => {
    let classes = 'card'

    if (depth.value > 0) {
      classes += ' reply'
    }

    return classes
  })

  const onReplyButtonClick = async () => {
    if (!loggedIn.value) {
      toast.add({
        title: t('reply.login'),
        color: 'error',
      })
      return
    }
    showReplyForm.value = !showReplyForm.value

    if (showReplyForm.value) {
      await nextTick()
      const form = document.getElementById(
        `reply-comment-form-${comment.value.id}`,
      )
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const onShowMoreRepliesButtonClick = async () => {
    showReplies.value = !showReplies.value

    if (showReplies.value && allReplies.value.length === 0) {
      options.onShowMoreReplies(comment.value?.id)
      await fetchReplies(cursor.value)
    }
  }

  const hasReplies = computed(() => {
    return (
      allReplies.value.length > 0 || (comment.value?.hasReplies ?? false)
    )
  })

  const totalReplies = computed(() => {
    return allReplies.value.length + (comment.value?.repliesCount ?? 0)
  })

  const pagination = computed(() => {
    if (!replies.value?.count) return
    return usePagination<BlogComment>(replies.value)
  })

  watch(
    () => cursorState.value[cursorKey.value],
    async (newValue) => {
      if (!newValue) return
      await fetchReplies(newValue)
    },
    { deep: true },
  )

  watch(
    replies,
    (newValue) => {
      if (newValue && newValue.results?.length) {
        const repliesMap = new Map(
          allReplies.value.map(reply => [reply.id, reply]),
        )
        newValue.results.forEach((newReply) => {
          repliesMap.set(newReply.id, newReply)
        })
        let sortedReplies
        if (paginationType.value === 'cursor') {
          sortedReplies = [...repliesMap.values()].sort((a, b) => {
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          })
          allReplies.value = sortedReplies
        }
        else {
          sortedReplies = newValue.results.sort((a, b) => {
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          })
          allReplies.value = sortedReplies
        }
      }
    },
    { deep: true, immediate: true },
  )

  return {
    commenterName,
    showReplyForm,
    allReplies,
    pending,
    repliesFetched,
    showReplies,
    isLineHovered,
    likes,
    cursorKey,
    blogPostId,
    likeClicked,
    replyCommentFormSchema,
    onReplySubmit,
    commentCardClass,
    onReplyButtonClick,
    onShowMoreRepliesButtonClick,
    hasReplies,
    totalReplies,
    pagination,
  }
}
