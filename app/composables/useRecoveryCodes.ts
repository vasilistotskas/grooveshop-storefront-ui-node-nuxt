/** A toast as `useToast().add` takes it. */
export type ToastInput = Parameters<ReturnType<typeof useToast>['add']>[0]

/**
 * The Security-area page a shopper goes back to: the redesign's own page,
 * or the settings page of a store with its own design.
 */
export type SecurityRoute = 'account-security' | 'account-settings'

/**
 * The shopper's recovery-code set (`GET authenticators/recovery-codes`),
 * shared by the codes page and the "generate a new set" page. A shopper
 * without two-step verification has no codes (allauth answers 404,
 * `headless/mfa/views.py` `ManageRecoveryCodesView.get`): the shopper is
 * told two-step verification is required and goes back to `securityRoute`.
 *
 * Awaited in `<script setup>`; every composable it needs is called before
 * its own `await`.
 */
export async function useRecoveryCodeSet(securityRoute: SecurityRoute) {
  const { getRecoveryCodes } = useAllAuthAccount()
  const toast = useToast()
  const localePath = useLocalePath()
  const { t } = useNuxtApp().$i18n

  const { data, error } = await useAsyncData('recoveryCodes', () => getRecoveryCodes())

  if (error.value) {
    toast.add({ title: t('auth.mfa.required'), color: 'error' })
    await navigateTo(localePath(securityRoute))
  }

  return {
    codes: computed(() => data.value?.data.unused_codes ?? []),
    unused: computed(() => data.value?.data.unused_code_count ?? 0),
    total: computed(() => data.value?.data.total_code_count ?? 0),
    createdAt: computed(() => data.value?.data.created_at),
    lastUsedAt: computed(() => data.value?.data.last_used_at),
  }
}

export interface RecoveryCodesOptions {
  securityRoute: SecurityRoute
  /** The toasts each tree words and dresses in its own way. */
  toasts: {
    copiedAll: () => ToastInput
    copiedOne: (code: string) => ToastInput
    /** A tree that confirms a download says so; the platform's page does not. */
    downloaded?: () => ToastInput
  }
  /** The lines of the downloaded and printed copies, in the tree's own words. */
  document: {
    title: () => string
    made: (date: string) => string
    keepSafe: () => string
  }
}

/**
 * The shopper's unused recovery codes: the set, each code or the whole
 * set copied, downloaded as a text file, or printed.
 *
 * The print window is written with `textContent`, never as HTML, so a code
 * cannot inject markup there.
 */
export async function useRecoveryCodes(options: RecoveryCodesOptions) {
  const toast = useToast()
  const { locale } = useNuxtApp().$i18n
  const { copy } = useClipboard()

  const set = await useRecoveryCodeSet(options.securityRoute)
  const { codes, createdAt } = set

  /** The date the set was made, as the downloaded and printed copies state it. */
  const madeOn = computed(() => createdAt.value ? new Date(createdAt.value * 1000).toLocaleDateString(locale.value) : '')

  async function copyAll() {
    await copy(codes.value.join('\n'))
    toast.add(options.toasts.copiedAll())
  }

  async function copyCode(code: string) {
    await copy(code)
    toast.add(options.toasts.copiedOne(code))
  }

  function download() {
    const { title, made, keepSafe } = options.document
    const text = `${title()} — ${made(madeOn.value)}\n\n${codes.value.join('\n')}\n\n${keepSafe()}`
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `recovery-codes-${Date.now()}.txt`
    link.click()
    URL.revokeObjectURL(url)
    if (options.toasts.downloaded) toast.add(options.toasts.downloaded())
  }

  function print() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const { title, made, keepSafe } = options.document
    const doc = printWindow.document
    doc.write(`<html><head><title></title><style>
    body { font-family: monospace; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 24px 0; }
    .code { padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; }
  </style></head><body><h1></h1><p class="made"></p><div class="codes"></div><p class="keep"></p></body></html>`)
    doc.close()
    doc.title = title()
    doc.querySelector('h1')!.textContent = title()
    doc.querySelector('.made')!.textContent = made(madeOn.value)
    const list = doc.querySelector('.codes')!
    for (const code of codes.value) {
      const item = doc.createElement('div')
      item.className = 'code'
      item.textContent = code
      list.appendChild(item)
    }
    doc.querySelector('.keep')!.textContent = keepSafe()
    printWindow.print()
  }

  return { ...set, copyAll, copyCode, download, print }
}
