/**
 * The contact form's attachment control: the store's policy, and one
 * upload's life from picked to claimable.
 *
 * The endpoint is a TWO-STEP handover, and this composable owns the
 * first step. A file is uploaded on its own, immediately, and the
 * reply carries a `uuid`; the enquiry is submitted later with those
 * ids in `attachmentIds`, and Django claims each one exactly once. So
 * a slow 20 MB drawing is not something the visitor waits on before
 * typing, a failed third file does not re-send the first two, and the
 * message they wrote is never lost to an upload error.
 *
 * `XMLHttpRequest`, not `$fetch`: this is the one place in the app
 * that needs UPLOAD progress, and `fetch` still cannot report it
 * (there is no request-side counterpart to a streamed response —
 * `ReadableStream` request bodies exist but carry no progress events
 * and need `duplex: 'half'`, which browsers restrict to HTTP/2). A
 * progress bar on a tender document is not decoration: without one, a
 * 25 MB upload on a site connection is indistinguishable from a hung
 * form.
 *
 * What this does NOT do is decide whether a file is acceptable. Size
 * and count are pre-checked here because they are free and the
 * feedback is immediate, but the TYPE is Django's call — it reads the
 * magic bytes, while everything a browser knows about a file's type
 * it inferred from the name. A client is not a gate; it is a
 * courtesy.
 */

/** Why an upload was refused. Rendered by the component, not here. */
export type AttachmentErrorCode
  = | 'too-large'
    | 'too-many'
    | 'throttled'
    | 'busy'
    | 'rejected'
    | 'network'

export interface AttachmentError {
  code: AttachmentErrorCode
  /**
   * The server's parsed body, for `rejected` only. Passed through
   * untouched so the component can render it with the same
   * `isDrfFieldErrorMap` / `formatDrfFieldErrors` pair the enquiry's
   * own failures use — the server owns the wording of "that type is
   * not accepted", and it already knows the store's allow-list.
   */
  data?: unknown
}

export type AttachmentStatus = 'uploading' | 'done' | 'error'

export interface AttachmentUpload {
  /** Client-side key; stable across a retry so the row does not jump. */
  key: string
  name: string
  size: number
  status: AttachmentStatus
  /** 0-100. Stays at 100 once the request is in flight but unanswered. */
  progress: number
  /** The id the enquiry spends to claim this file. */
  id?: string
  error?: AttachmentError
}

interface PendingUpload extends AttachmentUpload {
  file: File
  abort?: () => void
}

const UPLOAD_URL = '/api/contact/attachment'

/** A DRF error body, or `null` when the reply was not JSON at all. */
function parseBody(text: string): unknown {
  try {
    return JSON.parse(text)
  }
  catch {
    return null
  }
}

/**
 * One file's size, in the reader's own locale and units.
 *
 * `Intl` rather than a `${n} MB` template, because the unit's name and
 * its position are language, not formatting: Greek writes 2,4 MB with
 * a comma, and the abbreviation is not ours to hardcode per locale.
 */
export function formatAttachmentSize(bytes: number, locale: string): string {
  const megabytes = bytes / (1024 * 1024)
  const small = megabytes < 0.1
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: small ? 'kilobyte' : 'megabyte',
    maximumFractionDigits: small ? 0 : 1,
  }).format(small ? bytes / 1024 : megabytes)
}

/** Numeric merchant setting, defaulting when absent or unparsable. */
function settingNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function useContactAttachments() {
  const enabled = useSettingFlag('CONTACT_ATTACHMENTS_ENABLED', {
    // Fails CLOSED: this is an upload endpoint, and a settings hiccup
    // must not draw a control the server would 404.
    fallback: false,
  })

  const { data: countSetting } = useFetch<{ value?: string }>(
    '/api/settings/get',
    {
      key: 'setting-int:CONTACT_ATTACHMENTS_MAX_COUNT',
      query: { key: 'CONTACT_ATTACHMENTS_MAX_COUNT' },
      default: () => ({ value: '' }),
    },
  )
  const { data: sizeSetting } = useFetch<{ value?: string }>(
    '/api/settings/get',
    {
      key: 'setting-int:CONTACT_ATTACHMENTS_MAX_MB',
      query: { key: 'CONTACT_ATTACHMENTS_MAX_MB' },
      default: () => ({ value: '' }),
    },
  )
  const { data: typesSetting } = useFetch<{ value?: string }>(
    '/api/settings/get',
    {
      key: 'setting-str:CONTACT_ATTACHMENTS_TYPES',
      query: { key: 'CONTACT_ATTACHMENTS_TYPES' },
      default: () => ({ value: '' }),
    },
  )

  const maxCount = computed(() =>
    settingNumber(countSetting.value?.value, 3),
  )
  const maxMegabytes = computed(() =>
    settingNumber(sizeSetting.value?.value, 10),
  )
  const maxBytes = computed(() => maxMegabytes.value * 1024 * 1024)
  const allowedTypes = computed(() =>
    (typesSetting.value?.value ?? '')
      .split(',')
      .map(part => part.trim().toLowerCase())
      .filter(Boolean),
  )
  /**
   * The file picker's filter. MIME types straight from the setting: a
   * type the browser does not recognise simply widens the picker,
   * which is the right failure — Django still refuses the bytes.
   */
  const accept = computed(() => allowedTypes.value.join(','))

  const uploads = ref<PendingUpload[]>([])

  const attachmentIds = computed(() =>
    uploads.value
      .filter(upload => upload.status === 'done' && upload.id)
      .map(upload => upload.id as string),
  )
  const isUploading = computed(() =>
    uploads.value.some(upload => upload.status === 'uploading'),
  )
  const canAddMore = computed(() => uploads.value.length < maxCount.value)

  function send(upload: PendingUpload) {
    upload.status = 'uploading'
    upload.progress = 0
    upload.error = undefined

    const request = new XMLHttpRequest()
    upload.abort = () => request.abort()

    const body = new FormData()
    body.append('file', upload.file, upload.file.name)

    request.upload.addEventListener('progress', (progress) => {
      if (!progress.lengthComputable) return
      upload.progress = Math.round((progress.loaded / progress.total) * 100)
    })

    request.addEventListener('load', () => {
      // 2xx only. A 404 here is the store's switch being off, a 400 is
      // the type or size gate, a 429 is the throttle — all of them are
      // the server's message to show, not something to interpret.
      if (request.status >= 200 && request.status < 300) {
        try {
          const payload = JSON.parse(request.responseText) as { uuid?: string }
          if (!payload.uuid) throw new Error('no id')
          upload.id = payload.uuid
          upload.status = 'done'
          upload.progress = 100
          return
        }
        catch {
          upload.status = 'error'
          upload.error = { code: 'network' }
          return
        }
      }
      upload.status = 'error'
      // 429 and 503 are both "not now, and not your fault": the
      // caller's own budget, and the store's upload buffer. Neither
      // says anything about the FILE, so neither shows the server's
      // wording — retrying later is the whole message.
      upload.error = request.status === 429
        ? { code: 'throttled' }
        : request.status === 503
          ? { code: 'busy' }
          // 413 comes from the SSR hop or from the platform ceiling,
          // and only when this client's idea of the limit is stale —
          // the size is pre-checked above. It still means exactly
          // "too large", so it says that rather than "not accepted".
          : request.status === 413
            ? { code: 'too-large' }
            : { code: 'rejected', data: parseBody(request.responseText) }
    })

    request.addEventListener('error', () => {
      upload.status = 'error'
      upload.error = { code: 'network' }
    })

    request.addEventListener('abort', () => {
      uploads.value = uploads.value.filter(row => row.key !== upload.key)
    })

    request.open('POST', UPLOAD_URL)
    // No explicit Content-Type: the browser writes the multipart
    // boundary, and setting it by hand would omit that and make the
    // body unparsable.
    request.send(body)
  }

  /**
   * Queue picked files, refusing the ones that cannot possibly land.
   *
   * Returns the refusals so the caller can say why, since a file that
   * never starts uploading has no row of its own to carry an error.
   */
  function add(files: File[]): AttachmentError[] {
    const refused: AttachmentError[] = []
    for (const file of files) {
      if (!canAddMore.value) {
        refused.push({ code: 'too-many' })
        break
      }
      if (file.size > maxBytes.value) {
        refused.push({ code: 'too-large' })
        continue
      }
      const upload: PendingUpload = reactive({
        key: `${file.name}:${file.size}:${Date.now()}:${uploads.value.length}`,
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
        file,
      })
      uploads.value.push(upload)
      send(upload)
    }
    return refused
  }

  /**
   * Forget one upload.
   *
   * An in-flight request is aborted (its own `abort` handler drops the
   * row). A finished one is dropped locally and NOT deleted server
   * side: an unclaimed upload expires on its own and the reaper takes
   * it with its bytes, so there is no delete endpoint to give an
   * anonymous caller — and therefore none to abuse.
   */
  function remove(key: string) {
    const upload = uploads.value.find(row => row.key === key)
    if (!upload) return
    if (upload.status === 'uploading' && upload.abort) {
      upload.abort()
      return
    }
    uploads.value = uploads.value.filter(row => row.key !== key)
  }

  function retry(key: string) {
    const upload = uploads.value.find(row => row.key === key)
    if (upload && upload.status === 'error') send(upload)
  }

  /** After a successful submit: the ids have been spent. */
  function reset() {
    for (const upload of uploads.value) upload.abort?.()
    uploads.value = []
  }

  return {
    enabled,
    maxCount,
    maxMegabytes,
    maxBytes,
    allowedTypes,
    accept,
    uploads: readonly(uploads),
    attachmentIds,
    isUploading,
    canAddMore,
    add,
    remove,
    retry,
    reset,
  }
}
