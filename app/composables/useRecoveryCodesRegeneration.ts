/**
 * Replace the recovery codes with a new set. While codes are left,
 * generating cancels every one of them, so the shopper confirms that
 * first (`confirmed`); with none left there is nothing to lose and
 * nothing to confirm (`ready`). The new set is shown on the codes page.
 *
 * `generate()` resolves `true` once the new set exists, so the component
 * can announce it. Awaited in `<script setup>`.
 */
export async function useRecoveryCodesRegeneration(options: {
  /** The success toast, in the drawing's own words. */
  generated: () => ToastInput
}) {
  const { generateRecoveryCodes } = useAllAuthAccount()
  const toast = useToast()
  const localePath = useLocalePath()

  const { unused } = await useRecoveryCodeSet()

  const confirmed = ref(false)
  const loading = ref(false)

  const hasCodes = computed(() => unused.value > 0)
  const ready = computed(() => !hasCodes.value || confirmed.value)

  async function generate(): Promise<boolean> {
    if (!ready.value) return false
    loading.value = true
    try {
      await generateRecoveryCodes()
      toast.add(options.generated())
      await navigateTo(localePath('account-2fa-recovery-codes'))
      return true
    }
    catch (error) {
      handleAllAuthClientError(error)
      return false
    }
    finally {
      loading.value = false
    }
  }

  return { unused, hasCodes, confirmed, loading, ready, generate }
}
