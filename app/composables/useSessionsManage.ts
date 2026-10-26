/**
 * Where the shopper is signed in: the auth store's sessions, refreshed on
 * mount, and signing out of any of them. `signOut` is one at a time
 * (`busy` is the key of the one in flight: a session id, or `'others'`),
 * replaces the list with the sessions allauth answers with and toasts
 * `signedOut(count)`. It resolves `true` when the sessions were ended.
 */
export function useSessionsManage(options: { signedOut: (count: number) => ToastInput }) {
  const { deleteSession } = useAllAuthSessions()
  const toast = useToast()
  const authStore = useAuthStore()
  const { sessions, otherSessions } = storeToRefs(authStore)

  onMounted(() => {
    authStore.setupSessions()
  })

  const busy = ref<number | 'others' | null>(null)

  async function signOut(targets: Session[], key: number | 'others'): Promise<boolean> {
    busy.value = key
    try {
      const remaining = await deleteSession({ sessions: targets.map(session => session.id) })
      if (remaining) sessions.value = remaining.data
      toast.add(options.signedOut(targets.length))
      return true
    }
    catch (error) {
      handleAllAuthClientError(error)
      return false
    }
    finally {
      busy.value = null
    }
  }

  return { sessions, otherSessions, busy, signOut }
}
