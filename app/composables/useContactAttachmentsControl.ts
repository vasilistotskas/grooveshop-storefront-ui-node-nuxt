/**
 * What a contact form's attachment control does, for every design: the
 * hidden file input, the drop target, the toast for a file that was not
 * added, the words for a refusal, and the guard against sending while an
 * upload is still in flight. A design draws the control its own way and
 * binds these.
 *
 * The store's policy and one upload's life are `useContactAttachments`; this
 * is the form's side of it. Its words live in the form's own `files.*`
 * messages, so each design says them in its own copy (`t` is the form's
 * composer): `not_added`, `uploading`, `too_large`, `too_large_unknown`,
 * `too_many`, `throttled`, `busy`, `network` and `rejected`.
 *
 * The caller's template names the input `filePicker`.
 */
export function useContactAttachmentsControl(options: { t: ReturnType<typeof useI18n>['t'] }) {
  const { t } = options
  const toast = useToast()
  const attachments = useContactAttachments()
  const filePicker = useTemplateRef<HTMLInputElement>('filePicker')
  const isDropTarget = ref(false)

  /**
   * The composable reports a CODE; what it means is said here, in the
   * visitor's language. A rejection carries Django's own wording.
   */
  function attachmentMessage(error: AttachmentError): string {
    if (error.code === 'too-large') {
      // Django's own refusal can arrive while the store's limit is unreadable.
      const mb = attachments.maxMegabytes.value
      return mb === null ? t('files.too_large_unknown') : t('files.too_large', { mb })
    }
    if (error.code === 'too-many') return t('files.too_many', { count: attachments.maxCount.value })
    if (error.code === 'throttled') return t('files.throttled')
    if (error.code === 'busy') return t('files.busy')
    if (error.code === 'network') return t('files.network')
    return isDrfFieldErrorMap(error.data)
      ? formatDrfFieldErrors(error.data, t)
      : t('files.rejected')
  }

  function onFilesPicked(files: FileList | null) {
    if (!files?.length) return
    for (const refusal of attachments.add(Array.from(files))) {
      toast.add({
        title: t('files.not_added'),
        description: attachmentMessage(refusal),
        color: 'error',
      })
    }
    // So picking the same file again after removing it still fires `change`.
    if (filePicker.value) filePicker.value.value = ''
  }

  function onDrop(event: DragEvent) {
    isDropTarget.value = false
    onFilesPicked(event.dataTransfer?.files ?? null)
  }

  /**
   * Whether the enquiry may be sent now. An upload still in flight has no id
   * yet, and sending would silently drop it, so the visitor is told to wait.
   */
  function readyToSend(): boolean {
    if (!attachments.isUploading.value) return true
    toast.add({ title: t('files.uploading'), color: 'warning' })
    return false
  }

  /** The ids of the files already uploaded, or `undefined` when there are none, so a store without attachments never sends the field. */
  const attachmentIds = computed(() =>
    attachments.attachmentIds.value.length ? attachments.attachmentIds.value : undefined,
  )

  return {
    attachments,
    filePicker,
    isDropTarget,
    attachmentMessage,
    onFilesPicked,
    onDrop,
    readyToSend,
    attachmentIds,
  }
}
