import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { startBuilderCanvas } from '~/builder/canvas/bridge'
import { failWith } from '~~/test/helpers/api'

/**
 * The canvas's half of the preview, in a page framed by the editor: it draws
 * what its parent sends through `POST /api/builder/preview`, and never lets
 * the page it shows navigate or send a form. The parent stands in as a
 * message port, a real source a message can name.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const COPY = { draft: { sections: {}, order: [] }, i18n: {} }
const ANSWER: BuilderPreviewResponse = { pages: { 'template:home': { sections: [] } }, navigation: { header: [] } }

let parent: MessagePort
let tells: ReturnType<typeof vi.fn<MessagePort['postMessage']>>
let preview: Ref<BuilderPreviewResponse | null>
let stop: () => void

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  parent = new MessageChannel().port1
  tells = vi.fn<MessagePort['postMessage']>()
  vi.spyOn(parent, 'postMessage').mockImplementation(tells)
  Object.defineProperty(window, 'parent', { value: parent, configurable: true })
  api.routes({ '/api/builder/preview': ANSWER })
  preview = ref(null)
  stop = startBuilderCanvas(useNuxtApp(), preview)
})

afterEach(() => {
  stop()
  Reflect.deleteProperty(window, 'parent')
  document.body.replaceChildren()
  vi.useRealTimers()
})

const told = () => tells.mock.calls.map(([event]) => event.type)

function send(data: unknown, from: { source?: MessageEventSource, origin?: string } = {}) {
  window.dispatchEvent(new MessageEvent('message', { data, source: from.source ?? parent, origin: from.origin ?? window.location.origin }))
}

const documents = (copies: Record<string, unknown> = { 'template:home': COPY }) => ({ channel: BUILDER_CANVAS_CHANNEL, type: 'documents', documents: copies })

async function settle() {
  await vi.advanceTimersByTimeAsync(BUILDER_CANVAS_PREVIEW_DELAY_MS)
  await flushPromises()
}

describe('the canvas bridge', () => {
  it('tells its parent it listens, on its own origin', () => {
    expect(tells).toHaveBeenCalledWith({ channel: BUILDER_CANVAS_CHANNEL, type: 'ready' }, window.location.origin)
  })

  it('draws the copies it is sent, and says so', async () => {
    send(documents())
    await settle()

    expect(api.callsTo('/api/builder/preview')).toHaveLength(1)
    expect(api.callsTo('/api/builder/preview')[0]!.options).toMatchObject({ method: 'POST', body: { documents: { 'template:home': COPY } } })
    expect(preview.value).toEqual(ANSWER)
    expect(told()).toEqual(['ready', 'drawn'])
  })

  it('asks once for a burst of changes, with the last of them', async () => {
    send(documents({ 'template:home': COPY }))
    send(documents({ 'template:home': COPY, 'group:header': COPY }))
    await settle()

    expect(api.callsTo('/api/builder/preview')).toHaveLength(1)
    expect(Object.keys(api.callsTo('/api/builder/preview')[0]!.options.body.documents)).toEqual(['template:home', 'group:header'])
  })

  it.each([
    ['another window', () => send(documents(), { source: window })],
    ['another origin', () => send(documents(), { origin: 'https://evil.example' })],
    ['another channel', () => send({ ...documents(), channel: 'other' })],
    ['something that is not a command', () => send({ channel: BUILDER_CANVAS_CHANNEL, type: 'documents', documents: { nope: COPY } })],
  ])('ignores a message from %s', async (_case, deliver) => {
    deliver()
    await settle()

    expect(api.callsTo('/api/builder/preview')).toHaveLength(0)
  })

  it('keeps what it drew when a preview fails, and says so', async () => {
    send(documents())
    await settle()
    api.routes({ '/api/builder/preview': failWith(502) })

    send(documents())
    await settle()

    expect(preview.value).toEqual(ANSWER)
    expect(told()).toEqual(['ready', 'drawn', 'failed'])
  })

  it('drops an answer a later request overtook', async () => {
    let first!: (value: BuilderPreviewResponse) => void
    const late: BuilderPreviewResponse = { pages: {}, navigation: { footer: [] } }
    api.routes({
      '/api/builder/preview': () => new Promise<BuilderPreviewResponse>((resolve) => {
        first = resolve
      }),
    })
    send(documents())
    await settle()
    api.routes({ '/api/builder/preview': late })
    send(documents())
    await settle()

    first(ANSWER)
    await flushPromises()

    expect(preview.value).toEqual(late)
  })

  it('never follows a link: one of the store asks the editor to open it, another goes nowhere', () => {
    document.body.innerHTML = '<a id="in" href="/about"><span>About</span></a><a id="out" href="https://elsewhere.example/x">X</a>'
    const inside = new MouseEvent('click', { bubbles: true, cancelable: true })
    const outside = new MouseEvent('click', { bubbles: true, cancelable: true })

    document.querySelector('#in span')!.dispatchEvent(inside)
    document.querySelector('#out')!.dispatchEvent(outside)

    expect(inside.defaultPrevented).toBe(true)
    expect(outside.defaultPrevented).toBe(true)
    expect(tells.mock.calls.map(([event]) => event).filter(event => event.type === 'navigate')).toEqual([
      { channel: BUILDER_CANVAS_CHANNEL, type: 'navigate', path: '/about' },
    ])
  })

  it('never sends a form', () => {
    document.body.innerHTML = '<form id="f" action="/api/newsletter"><button>Go</button></form>'
    const submit = new SubmitEvent('submit', { bubbles: true, cancelable: true })

    document.querySelector('#f')!.dispatchEvent(submit)

    expect(submit.defaultPrevented).toBe(true)
  })

  it('stops listening when stopped', async () => {
    stop()
    send(documents())
    await settle()

    expect(api.callsTo('/api/builder/preview')).toHaveLength(0)
  })
})
