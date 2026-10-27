type Translate = ReturnType<typeof useI18n>['t']

/**
 * A like toggle: the signed-in shopper's click is sent to Django, and
 * only once Django accepted it do the like state and the parent's count
 * change. A refusal is one toast with Django's reason (never a rejection
 * out of the click handler: UButton hands one to Vue's error handler).
 */
async function toggleLike(options: {
  endpoint: string
  /** The action's id for the failure toast, so a repeated failure pulses one toast. */
  action: string
  /** The `log.error` action. */
  logAction: string
  t: Translate
  /** `useApiError().notify`, taken in setup scope by the caller. */
  notify: ReturnType<typeof useApiError>['notify']
  liked: boolean
  /** Applies the change once Django accepted it. */
  apply: (liked: boolean) => void
}) {
  try {
    await $api(options.endpoint, { method: 'POST' })
  }
  catch (error) {
    log.error({ action: options.logAction, error })
    options.notify(options.action, error, { title: options.t('error_occurred') })
    return
  }

  options.apply(!options.liked)
}

/**
 * The like button of a blog post. Shared by every drawing of it
 * (`Button/Blog/Post/Like.vue` and the tenants' own), each passing its
 * own `t` so the words stay in its own messages.
 *
 * `onLoggedOut` runs for a visitor who is not signed in, in place of the
 * request (the drawing opens its sign-in).
 */
export function useBlogPostLike(options: {
  blogPostId: Ref<number>
  t: Translate
  onToggled: (payload: { blogPostId: number, liked: boolean }) => void
  onLoggedOut: () => void
}) {
  const { blogPostId, t } = options
  const toast = useToast()
  const { notify } = useApiError()
  const { loggedIn } = useUserSession()
  const { blogPostLiked, addLikedPost, removeLikedPost } = useUserStore()

  const liked = computed(() => blogPostLiked(blogPostId.value))

  const toggle = async () => {
    if (!loggedIn.value) {
      options.onLoggedOut()
      toast.add({
        title: t('not_authenticated'),
        color: 'error',
      })
      return
    }

    await toggleLike({
      endpoint: `/api/blog/posts/${blogPostId.value}/update-likes`,
      action: 'Post-Like',
      logAction: 'blog:postLike',
      t,
      notify,
      liked: liked.value,
      apply: (nowLiked) => {
        options.onToggled({ blogPostId: blogPostId.value, liked: nowLiked })
        if (nowLiked) {
          addLikedPost(blogPostId.value)
          toast.add({
            title: t('added'),
            color: 'success',
          })
        }
        else {
          removeLikedPost(blogPostId.value)
          toast.add({
            title: t('removed'),
            color: 'error',
          })
        }
      },
    })
  }

  return { liked, toggle }
}

/**
 * The like button of a blog comment. Shared like `useBlogPostLike`
 * (`Button/Blog/Comment/Like.vue` and the tenants' own).
 */
export function useBlogCommentLike(options: {
  blogCommentId: Ref<number>
  t: Translate
  onToggled: (payload: { blogCommentId: number, liked: boolean }) => void
}) {
  const { blogCommentId, t } = options
  const toast = useToast()
  const { notify } = useApiError()
  const { loggedIn } = useUserSession()
  const { blogCommentLiked, addLikedComment, removeLikedComment } = useUserStore()

  const liked = computed(() => blogCommentLiked(blogCommentId.value))

  const toggle = async () => {
    if (!loggedIn.value) {
      toast.add({
        title: t('not_authenticated'),
        color: 'error',
      })
      return
    }

    await toggleLike({
      endpoint: `/api/blog/comments/${blogCommentId.value}/update-likes`,
      action: 'Comment-Like',
      logAction: 'blog:commentLike',
      t,
      notify,
      liked: liked.value,
      apply: (nowLiked) => {
        options.onToggled({ blogCommentId: blogCommentId.value, liked: nowLiked })
        if (nowLiked) addLikedComment(blogCommentId.value)
        else removeLikedComment(blogCommentId.value)
      },
    })
  }

  return { liked, toggle }
}
