/**
 * The single allow-list of origins that may appear in an embedded
 * ``<iframe>`` inside admin-authored rich text.
 *
 * Deliberately shared by the two places that must agree, because if
 * they ever disagree the failure is silent:
 *
 *   - ``sanitizeRichHtml`` (``shared/utils/html.ts``) — strips an
 *     iframe whose ``src`` is not listed here.
 *   - ``buildCspDirectives`` (``shared/utils/csp.ts``) — appends these
 *     to ``frame-src`` so the browser will actually render them.
 *
 * A video that survives the sanitiser but is missing from ``frame-src``
 * renders as a blank box with only a console entry; one allowed by CSP
 * but stripped by the sanitiser never reaches the DOM at all. Both
 * shapes were live: TinyMCE-embedded videos showed in the Django admin
 * editor and silently vanished on the storefront, reported by the site
 * owner against ``/blog/post/8/…`` — the iframe was dropped by an
 * unconfigured ``DOMPurify.sanitize()`` AND ``frame-src`` listed no
 * video host, so both layers had to be fixed to see a single video.
 *
 * Kept as origins (scheme + host, no path) because that is the unit
 * both consumers need: ``URL.origin`` comparison here, and CSP source
 * expressions there.
 *
 * Pure module — no Nuxt/Nitro imports — so ``csp.ts`` can import it
 * without breaking its build-time consumer.
 */
export const EMBED_IFRAME_ORIGINS: readonly string[] = [
  // YouTube. ``youtube-nocookie`` is the privacy-preserving variant and
  // is what TinyMCE emits when "privacy-enhanced mode" is on, so both
  // have to be listed or embeds break depending on an editor toggle.
  'https://www.youtube.com',
  'https://www.youtube-nocookie.com',
  // Vimeo's player is a separate origin from its site.
  'https://player.vimeo.com',
]

/**
 * Attributes an embedded player legitimately needs.
 *
 * ``srcdoc`` is NOT here and must never be: it opens a full nested
 * document with no origin of its own, which is DOMPurify's own stated
 * reason for forbidding ``iframe`` by default.
 */
export const EMBED_IFRAME_ATTRS: readonly string[] = [
  'allow',
  'allowfullscreen',
  'frameborder',
  'loading',
  'referrerpolicy',
  'title',
]

/**
 * True when ``src`` points at an allow-listed embed origin.
 *
 * Compares parsed ``URL.origin`` rather than matching a substring: a
 * check like ``src.includes('youtube.com')`` is defeated by
 * ``https://youtube.com.evil.example/`` and by
 * ``https://evil.example/?x=youtube.com``.
 *
 * A relative or unparseable ``src`` is rejected — an embed always
 * carries an absolute URL, so anything else is either broken markup or
 * an attempt to smuggle something past the check.
 */
export function isAllowedEmbedUrl(src: string | null | undefined): boolean {
  if (!src) return false
  try {
    return EMBED_IFRAME_ORIGINS.includes(new URL(src).origin)
  }
  catch {
    return false
  }
}
