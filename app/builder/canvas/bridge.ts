import type { NuxtApp } from '#app'

/**
 * The canvas's half of the editor's preview: a store page, framed by the
 * editor on the same origin (`builderCanvasFraming`), that draws the working
 * copies the editor sends instead of the published store.
 *
 * - It takes a command only from its parent window, its own origin, on its
 *   channel, and only if it parses (`ZodBuilderCanvasCommand`).
 * - The copies are drawn by the storefront itself: one request to
 *   `POST /api/builder/preview` (the published pipeline, run on the copies)
 *   puts the answer in `useBuilderCanvasPreview`, where `useBuilderPage` and
 *   `useNavigation` read it. Every design draws them with its own components.
 *   A burst of changes is one request (`BUILDER_CANVAS_PREVIEW_DELAY_MS`), and
 *   an answer overtaken by a later request is dropped.
 * - A preview is a picture of the store, not a store to shop in: a click on
 *   a section selects it in the editor, a link outside the sections asks the
 *   editor to open where it leads (the canvas stays put), and a form is
 *   never sent.
 * - It says where the section under the pointer and the selected one are
 *   drawn (`boxes`), whenever that changes: the pointer moves to another
 *   section, the selection changes, the page scrolls, resizes or is redrawn.
 *   The editor draws the outlines and the toolbar over the frame, in its own
 *   look; the store's page is never painted on.
 *
 * Answers the function that stops it.
 */
export function startBuilderCanvas(nuxtApp: NuxtApp, preview: Ref<BuilderPreviewResponse | null>): () => void {
  const origin = window.location.origin
  const listening = new AbortController()
  const { signal } = listening
  const tell = (event: BuilderCanvasEvent) => window.parent.postMessage(event, origin)

  let pending: ReturnType<typeof setTimeout> | undefined
  let latest = 0
  let hovered: string | null = null
  let selected: string | null = null
  let measuring = 0

  const sectionAt = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>(`[${BUILDER_CANVAS_NODE_ATTRIBUTE}]`) : null
  const sectionOf = (node: string) =>
    document.querySelector<HTMLElement>(`[${BUILDER_CANVAS_NODE_ATTRIBUTE}="${CSS.escape(node)}"]`)

  function boxOf(node: string | null): BuilderCanvasBox | null {
    const element = node ? sectionOf(node) : null
    if (!node || !element) return null
    // The mark is `display: contents`: the section is the box of what it holds.
    const range = document.createRange()
    range.selectNodeContents(element)
    const { x, y, width, height } = range.getBoundingClientRect()
    return width > 0 && height > 0 ? { node, x, y, width, height } : null
  }

  /** Says where the sections are, once per frame however many changes ask for it. */
  function measure(): void {
    if (measuring) return
    measuring = requestAnimationFrame(() => {
      measuring = 0
      tell({ channel: BUILDER_CANVAS_CHANNEL, type: 'boxes', hover: hovered === selected ? null : boxOf(hovered), selected: boxOf(selected) })
    })
  }

  /** Brings the selected section into view when none of it is in view, then says where it is. */
  function showSelected(): void {
    const box = boxOf(selected)
    // The canvas's own window only: `scrollIntoView` would scroll the editor
    // around the frame as well, since both are on the same origin.
    if (box && (box.y + box.height < 0 || box.y > window.innerHeight)) {
      window.scrollTo({ top: window.scrollY + box.y, behavior: 'smooth' })
    }
    measure()
  }

  function select(node: string | null): void {
    selected = node
    showSelected()
  }

  async function draw(documents: BuilderCanvasDocuments): Promise<void> {
    const request = ++latest
    try {
      const answer = await nuxtApp.runWithContext(() => $api<BuilderPreviewResponse>('/api/builder/preview', {
        method: 'POST',
        body: { documents },
      }))
      if (request !== latest) return
      preview.value = answer
      await nextTick()
      tell({ channel: BUILDER_CANVAS_CHANNEL, type: 'drawn' })
      // A move or a duplicate redraws the page: the selection stays in view.
      showSelected()
    }
    catch {
      // The route logs its own failure; the canvas keeps what it last drew.
      if (request === latest) tell({ channel: BUILDER_CANVAS_CHANNEL, type: 'failed' })
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.origin !== origin) return
    const command = ZodBuilderCanvasCommand.safeParse(event.data)
    if (!command.success) return
    if (command.data.type === 'select') {
      select(command.data.node)
      return
    }
    const { documents } = command.data
    clearTimeout(pending)
    pending = setTimeout(() => draw(documents), BUILDER_CANVAS_PREVIEW_DELAY_MS)
  }, { signal })

  document.addEventListener('pointerover', (event) => {
    const node = sectionAt(event.target)?.getAttribute(BUILDER_CANVAS_NODE_ATTRIBUTE) ?? null
    if (node === hovered) return
    hovered = node
    measure()
  }, { signal })
  document.documentElement.addEventListener('pointerleave', () => {
    hovered = null
    measure()
  }, { signal })
  window.addEventListener('scroll', measure, { capture: true, passive: true, signal })
  window.addEventListener('resize', measure, { signal })
  const resizing = new ResizeObserver(measure)
  resizing.observe(document.body)

  document.addEventListener('click', (event) => {
    const section = sectionAt(event.target)
    if (section) {
      event.preventDefault()
      event.stopPropagation()
      tell({ channel: BUILDER_CANVAS_CHANNEL, type: 'pick', node: section.getAttribute(BUILDER_CANVAS_NODE_ATTRIBUTE)! })
      return
    }
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link) return
    event.preventDefault()
    const target = new URL(link.href, window.location.href)
    if (target.origin === origin) tell({ channel: BUILDER_CANVAS_CHANNEL, type: 'navigate', path: target.pathname })
  }, { capture: true, signal })

  document.addEventListener('submit', event => event.preventDefault(), { capture: true, signal })

  tell({ channel: BUILDER_CANVAS_CHANNEL, type: 'ready' })

  return () => {
    listening.abort()
    resizing.disconnect()
    cancelAnimationFrame(measuring)
    clearTimeout(pending)
    latest++
  }
}
