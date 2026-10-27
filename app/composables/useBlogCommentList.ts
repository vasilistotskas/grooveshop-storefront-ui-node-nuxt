/**
 * How a post's comment list orders and marks its comments: the signed-in
 * reader's own comment comes first and is marked as theirs.
 *
 * Shared by every drawing of the list (`Blog/Post/Comments/List.vue` and
 * the tenants' own). Call it from a `<script setup>`.
 */
export function useBlogCommentList(comments: MaybeRefOrGetter<BlogComment[] | null>) {
  const { loggedIn, user } = useUserSession()

  const userHasCommented = (comment: BlogComment) => {
    if (loggedIn.value && user.value) {
      return comment.user.id === user.value.id
    }
    return false
  }

  const sortedComments = computed(() => {
    const all = toValue(comments)
    if (!all) return []
    return [...all].sort((a) => {
      if (loggedIn.value && user.value && a.user.id === user.value.id) {
        return -1
      }
      return 0
    })
  })

  return { userHasCommented, sortedComments }
}
