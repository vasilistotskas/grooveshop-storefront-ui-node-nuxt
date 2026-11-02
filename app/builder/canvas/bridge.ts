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
 * - A preview is a picture of the store, not a store to shop in: a link asks
 *   the editor to open where it leads and the canvas stays put; a form is
 *   never sent.
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
    clearTimeout(pending)
    pending = setTimeout(() => draw(command.data.documents), BUILDER_CANVAS_PREVIEW_DELAY_MS)
  }, { signal })

  document.addEventListener('click', (event) => {
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
    clearTimeout(pending)
    latest++
  }
}
