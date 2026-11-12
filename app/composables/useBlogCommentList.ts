/**
 * How a post's comment list orders and marks its comments: the signed-in
 * reader's own comment comes first and is marked as theirs.
 *
 * The page is cached and sent anonymously, so the server never knows the
 * reader: their comments are put first, and marked, only once the browser has
 * mounted. Doing it during hydration would draw a list the server did not
 * send (a mismatch on every signed-in visit).
 *
 * Shared by every drawing of the list (`Blog/Post/Comments/List.vue` and
 * the tenants' own). Call it from a `<script setup>`.
 */
export function useBlogCommentList(comments: MaybeRefOrGetter<BlogComment[] | null>) {
  const { loggedIn, user } = useSessionAfterHydration()

  const userHasCommented = (comment: BlogComment) =>
    loggedIn.value && !!user.value && comment.user.id === user.value.id

  // Own comments first, every other comment (and the reader's own among
  // themselves) in the order it came: a partition, which is stable by
  // construction, not a comparator that ignores one side.
  const sortedComments = computed(() => {
    const all = toValue(comments)
    if (!all) return []
    return [...all.filter(userHasCommented), ...all.filter(comment => !userHasCommented(comment))]
  })

  return { userHasCommented, sortedComments }
}
