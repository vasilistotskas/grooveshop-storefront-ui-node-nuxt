/**
 * The shopper's passkeys and security keys: the auth store's
 * authenticators of type WebAuthn, renamed or removed one at a time.
 *
 * Every change is checked (allauth answers 200), toasts `messages` on
 * success and reports a failure, headed `messages.failed()`, through
 * `useApiError`. The store is
 * refreshed after it either way, so the Security page's two-step tile
 * counts the same keys. Allauth may answer a change with a
 * re-authentication flow; the auth plugin routes that, and the refresh
 * afterwards shows the result. `rename` and `remove` resolve `true` when
 * the change went through.
 */
export function useWebAuthnKeys(messages: { renamed: () => ToastInput, removed: () => ToastInput, failed: () => string }) {
  const toast = useToast()
  const { notify } = useApiError()
  const { deleteWebAuthnCredential, updateWebAuthnCredential } = useAllAuthAccount()
  const authStore = useAuthStore()
  const { authenticators } = storeToRefs(authStore)

  const keys = computed(() =>
    (authenticators.value ?? []).filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN),
  )

  /** The id of the key being changed: one change at a time. */
  const busy = ref<number | null>(null)

  async function change(id: number, request: () => Promise<{ status?: number } | undefined>, done: () => ToastInput): Promise<boolean> {
    busy.value = id
    try {
      const response = await request()
      if (response?.status !== 200) throw new Error(`status ${response?.status}`)
      toast.add(done())
      return true
    }
    catch (error) {
      log.error({ action: 'webauthn:change', error })
      notify('webauthn:change', error, { title: messages.failed() })
      return false
    }
    finally {
      busy.value = null
      await authStore.setupAuthenticators()
    }
  }

  async function rename(id: number, draft: string): Promise<boolean> {
    const name = draft.trim()
    if (!name) return false
    return change(id, () => updateWebAuthnCredential({ id, name }), messages.renamed)
  }

  const remove = (id: number) => change(id, () => deleteWebAuthnCredential({ authenticators: [id] }), messages.removed)

  return { keys, busy, rename, remove }
}
