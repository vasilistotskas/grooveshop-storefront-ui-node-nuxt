/**
 * Plays an embed facade (``sanitizeRichHtml`` in ``shared/utils/html.ts``)
 * when the visitor presses it: the button is replaced with the player, in
 * the same box and with the same style, set to start at once.
 *
 * One listener on the document, not a handler per renderer: rich text
 * is ``v-html`` and a blog body is never hydrated, so no Vue handler can
 * reach the button. A native button already turns Enter and Space into
 * this click.
 */
export default defineNuxtPlugin(() => {
  useEventListener(document, 'click', (event) => {
    if (!(event.target instanceof Element)) return
    const facade = event.target.closest<HTMLElement>('.embed-facade')
    if (!facade) return

    const { embedSrc, embedTitle } = facade.dataset
    if (!embedSrc || !isAllowedEmbedUrl(embedSrc)) return

    const player = document.createElement('iframe')
    player.src = embedSrc
    player.className = facade.className
    player.classList.remove('embed-facade')
    const style = facade.getAttribute('style')
    if (style) player.setAttribute('style', style)
    if (embedTitle) player.title = embedTitle
    player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    player.allowFullscreen = true
    player.referrerPolicy = 'strict-origin-when-cross-origin'

    facade.replaceWith(player)
    // The pressed button is gone; keep a keyboard visitor where they were.
    player.focus()
  })
})
