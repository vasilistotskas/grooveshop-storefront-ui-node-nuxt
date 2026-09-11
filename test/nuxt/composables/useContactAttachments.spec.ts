import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

/**
 * The contact form's upload step. What matters:
 *
 * - the store's own limits are what bind, not this file's defaults;
 * - a file too large or one too many never leaves the browser, and the
 *   caller is told why;
 * - a 2xx yields the id the enquiry will spend, and NOTHING else does
 *   — a 400, a 404 (attachments switched off) and a 429 all leave the
 *   row in `error` with something to say;
 * - cancel drops the row, retry re-sends it, and a sent enquiry spends
 *   the ids so a second submit cannot re-claim them.
 */
const { mockFetch, settings } = vi.hoisted(() => ({
  settings: {} as Record<string, string>,
  mockFetch: vi.fn((...args: any[]) => {
    const url = String(args[0])
    if (url.includes('/api/settings/public')) {
      return Promise.resolve({ settings: { ...settings } })
    }
    return Promise.resolve({})
  }),
}))
mockNuxtImport('$fetch', () => mockFetch)

/** One canned XHR exchange, driven by the test rather than a server. */
class FakeXhr {
  static instances: FakeXhr[] = []

  status = 0
  responseText = ''
  sent: FormData | null = null
  aborted = false
  upload = { addEventListener: (name: string, fn: (e: any) => void) => {
    this.uploadHandlers[name] = fn
  } }

  private handlers: Record<string, (e?: any) => void> = {}
  private uploadHandlers: Record<string, (e: any) => void> = {}

  constructor() {
    FakeXhr.instances.push(this)
  }

  addEventListener(name: string, fn: (e?: any) => void) {
    this.handlers[name] = fn
  }

  open() {}

  send(body: FormData) {
    this.sent = body
    // Nothing fires until the test says so, so a test can observe the
    // in-flight state.
  }

  abort() {
    this.aborted = true
    this.handlers.abort?.()
  }

  /** Report upload progress, as a real XHR would mid-transfer. */
  progress(loaded: number, total: number) {
    this.uploadHandlers.progress?.({ lengthComputable: true, loaded, total })
  }

  /** Complete the request with a status and body. */
  finish(status: number, body: string) {
    this.status = status
    this.responseText = body
    this.handlers.load?.()
  }

  /** A transport failure: no status, no body. */
  fail() {
    this.handlers.error?.()
  }
}

const originalXhr = globalThis.XMLHttpRequest

function file(name: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type: 'application/pdf' })
  return new File([blob], name, { type: 'application/pdf' })
}

async function policy() {
  const nuxtApp = useNuxtApp()
  // `useFetch` caches by key across tests in the shared nuxt app, and
  // this composable's keys are fixed (they exist to DEDUPE readers of
  // the same setting), so without this a later test reads the value an
  // earlier one mocked.
  await nuxtApp.runWithContext(() => clearNuxtData())
  const attachments = await nuxtApp.runWithContext(() =>
    useContactAttachments(),
  )
  await settle()
  return attachments
}

async function settle() {
  await new Promise(resolve => setTimeout(resolve, 20))
  await nextTick()
}

describe('useContactAttachments', () => {
  beforeEach(() => {
    FakeXhr.instances = []
    globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest
    for (const key of Object.keys(settings)) delete settings[key]
    settings.CONTACT_ATTACHMENTS_ENABLED = 'True'
    settings.CONTACT_ATTACHMENTS_MAX_COUNT = '2'
    settings.CONTACT_ATTACHMENTS_MAX_MB = '1'
    settings.CONTACT_ATTACHMENTS_TYPES = 'application/pdf,application/zip'
  })

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXhr
  })

  it('reads the store own limits and offers them as a picker filter', async () => {
    const attachments = await policy()

    expect(attachments.enabled.value).toBe(true)
    expect(attachments.maxCount.value).toBe(2)
    expect(attachments.maxMegabytes.value).toBe(1)
    expect(attachments.maxBytes.value).toBe(1024 * 1024)
    expect(attachments.allowedTypes.value).toEqual([
      'application/pdf',
      'application/zip',
    ])
    expect(attachments.accept.value).toBe('application/pdf,application/zip')
  })

  it('uploads a file and keeps the id the enquiry will spend', async () => {
    const attachments = await policy()

    attachments.add([file('plan.pdf', 2048)])
    expect(attachments.isUploading.value).toBe(true)
    expect(attachments.attachmentIds.value).toEqual([])

    const request = FakeXhr.instances[0]!
    expect(request.sent?.get('file')).toBeInstanceOf(File)

    request.progress(1024, 2048)
    await nextTick()
    expect(attachments.uploads.value[0]!.progress).toBe(50)

    request.finish(201, JSON.stringify({ uuid: 'a-b-c' }))
    await nextTick()

    expect(attachments.uploads.value[0]!.status).toBe('done')
    expect(attachments.attachmentIds.value).toEqual(['a-b-c'])
    expect(attachments.isUploading.value).toBe(false)
  })

  it('refuses a file over the store limit without sending it', async () => {
    const attachments = await policy()

    const refused = attachments.add([file('huge.pdf', 2 * 1024 * 1024)])

    expect(refused).toEqual([{ code: 'too-large' }])
    expect(FakeXhr.instances).toHaveLength(0)
    expect(attachments.uploads.value).toHaveLength(0)
  })

  it('refuses more files than the store allows', async () => {
    const attachments = await policy()

    const refused = attachments.add([
      file('a.pdf', 16),
      file('b.pdf', 16),
      file('c.pdf', 16),
    ])

    expect(refused).toEqual([{ code: 'too-many' }])
    expect(attachments.uploads.value).toHaveLength(2)
    expect(attachments.canAddMore.value).toBe(false)
  })

  it('keeps the server own words when the server refuses the bytes', async () => {
    const attachments = await policy()
    attachments.add([file('drawing.pdf', 32)])

    FakeXhr.instances[0]!.finish(
      400,
      JSON.stringify({ file: ['That file type is not accepted.'] }),
    )
    await nextTick()

    const upload = attachments.uploads.value[0]!
    expect(upload.status).toBe('error')
    expect(upload.error).toEqual({
      code: 'rejected',
      data: { file: ['That file type is not accepted.'] },
    })
    // Nothing to claim.
    expect(attachments.attachmentIds.value).toEqual([])
  })

  it('treats the switch being off as a rejection, not a crash', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])

    FakeXhr.instances[0]!.finish(404, JSON.stringify({ detail: 'Not found.' }))
    await nextTick()

    expect(attachments.uploads.value[0]!.error?.code).toBe('rejected')
  })

  it('names the throttle so the message is not the server English', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])

    FakeXhr.instances[0]!.finish(429, '{"detail":"Request was throttled."}')
    await nextTick()

    expect(attachments.uploads.value[0]!.error).toEqual({ code: 'throttled' })
  })

  it('names a full upload buffer so the message is not about the file', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])

    FakeXhr.instances[0]!.finish(503, '{"detail":"Files cannot be accepted."}')
    await nextTick()

    expect(attachments.uploads.value[0]!.error).toEqual({ code: 'busy' })
  })

  it('reads a 413 as too-large, which is what it means', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])

    FakeXhr.instances[0]!.finish(413, '{"detail":"That file is too large."}')
    await nextTick()

    expect(attachments.uploads.value[0]!.error).toEqual({ code: 'too-large' })
  })

  it('treats a 2xx with no id as a failure', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])

    FakeXhr.instances[0]!.finish(201, 'not json at all')
    await nextTick()

    expect(attachments.uploads.value[0]!.status).toBe('error')
    expect(attachments.attachmentIds.value).toEqual([])
  })

  it('reports a dropped connection', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])

    FakeXhr.instances[0]!.fail()
    await nextTick()

    expect(attachments.uploads.value[0]!.error).toEqual({ code: 'network' })
  })

  it('cancels an upload in flight and drops its row', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])
    const key = attachments.uploads.value[0]!.key

    attachments.remove(key)
    await nextTick()

    expect(FakeXhr.instances[0]!.aborted).toBe(true)
    expect(attachments.uploads.value).toHaveLength(0)
    expect(attachments.canAddMore.value).toBe(true)
  })

  it('drops a finished upload locally without asking the server', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])
    FakeXhr.instances[0]!.finish(201, JSON.stringify({ uuid: 'x' }))
    await nextTick()

    attachments.remove(attachments.uploads.value[0]!.key)
    await nextTick()

    // No DELETE: an unclaimed upload expires and the reaper takes it,
    // so there is no endpoint for an anonymous caller to abuse.
    expect(FakeXhr.instances).toHaveLength(1)
    expect(attachments.attachmentIds.value).toEqual([])
  })

  it('retries a failed upload on the same row', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])
    FakeXhr.instances[0]!.fail()
    await nextTick()
    const key = attachments.uploads.value[0]!.key

    attachments.retry(key)
    await nextTick()

    expect(FakeXhr.instances).toHaveLength(2)
    expect(attachments.uploads.value[0]!.key).toBe(key)
    expect(attachments.uploads.value[0]!.status).toBe('uploading')
    expect(attachments.uploads.value[0]!.error).toBeUndefined()

    FakeXhr.instances[1]!.finish(201, JSON.stringify({ uuid: 'second-try' }))
    await nextTick()
    expect(attachments.attachmentIds.value).toEqual(['second-try'])
  })

  it('does not retry an upload that has not failed', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])

    attachments.retry(attachments.uploads.value[0]!.key)

    expect(FakeXhr.instances).toHaveLength(1)
  })

  it('spends the ids on reset so a second submit cannot re-claim them', async () => {
    const attachments = await policy()
    attachments.add([file('plan.pdf', 32)])
    FakeXhr.instances[0]!.finish(201, JSON.stringify({ uuid: 'once' }))
    await nextTick()

    attachments.reset()
    await nextTick()

    expect(attachments.attachmentIds.value).toEqual([])
    expect(attachments.uploads.value).toHaveLength(0)
  })

  it('falls back to the platform defaults when a setting is unusable', async () => {
    settings.CONTACT_ATTACHMENTS_MAX_COUNT = 'not a number'
    settings.CONTACT_ATTACHMENTS_MAX_MB = '0'
    settings.CONTACT_ATTACHMENTS_TYPES = '  '

    const attachments = await policy()

    expect(attachments.maxCount.value).toBe(3)
    expect(attachments.maxMegabytes.value).toBe(10)
    expect(attachments.allowedTypes.value).toEqual([])
    expect(attachments.accept.value).toBe('')
  })
})

describe('formatAttachmentSize', () => {
  it('shows small files in kilobytes and larger ones in megabytes', () => {
    expect(formatAttachmentSize(4096, 'en')).toContain('4')
    expect(formatAttachmentSize(4096, 'en').toLowerCase()).toContain('kb')
    expect(formatAttachmentSize(6 * 1024 * 1024, 'en').toLowerCase())
      .toContain('mb')
  })

  it('formats the number the way the locale writes it', () => {
    // Greek uses a comma for the decimal separator.
    expect(formatAttachmentSize(2.5 * 1024 * 1024, 'el')).toContain('2,5')
    expect(formatAttachmentSize(2.5 * 1024 * 1024, 'en')).toContain('2.5')
  })
})
