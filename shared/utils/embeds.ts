/**
 * The single allow-list of origins that may appear in an embedded
 * ``<iframe>`` inside admin-authored rich text.
 *
 * Deliberately shared by the two places that must agree, because if
 * they ever disagree the failure is silent:
 *
 *   - ``sanitizeRichHtml`` (``shared/utils/html.ts``) — strips an
 *     iframe whose ``src`` is not listed here.
 *   - ``buildCspDirectives`` (``shared/utils/csp.ts``) — appends the
 *     origins they are framed from (``EMBED_FRAME_ORIGINS``) to
 *     ``frame-src`` so the browser will actually render them.
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
/**
 * The only origin a YouTube video is ever framed from.
 *
 * Every YouTube embed, whichever origin its author wrote, is played
 * from the privacy-enhanced host: the regular one sets YouTube and
 * DoubleClick cookies as soon as the frame loads, which was before the
 * visitor had answered the cookie banner.
 */
export const YOUTUBE_PLAYER_ORIGIN = 'https://www.youtube-nocookie.com'

/**
 * Where a YouTube facade's poster comes from (see ``sanitizeRichHtml``).
 * Listed in CSP ``img-src``.
 */
export const YOUTUBE_THUMBNAIL_ORIGIN = 'https://i.ytimg.com'

/**
 * The origins an author's YouTube iframe may name. ``youtube-nocookie``
 * is what TinyMCE emits when "privacy-enhanced mode" is on, so both
 * have to be accepted or embeds break depending on an editor toggle.
 */
const YOUTUBE_EMBED_ORIGINS: readonly string[] = [
  'https://www.youtube.com',
  YOUTUBE_PLAYER_ORIGIN,
]

/** Vimeo's player is a separate origin from its site. */
const VIMEO_PLAYER_ORIGIN = 'https://player.vimeo.com'

export const EMBED_IFRAME_ORIGINS: readonly string[] = [
  ...YOUTUBE_EMBED_ORIGINS,
  VIMEO_PLAYER_ORIGIN,
]

/**
 * The origins an embed is actually FRAMED from, which is what CSP
 * ``frame-src`` needs: a YouTube video is only ever played from
 * ``YOUTUBE_PLAYER_ORIGIN`` (``sanitizeRichHtml`` rewrites the rest),
 * so ``www.youtube.com`` is accepted in the HTML but never framed.
 */
export const EMBED_FRAME_ORIGINS: readonly string[] = [
  YOUTUBE_PLAYER_ORIGIN,
  VIMEO_PLAYER_ORIGIN,
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

/** A YouTube video an author embedded: its id and where playback starts. */
export interface YouTubeEmbed {
  id: string
  /** Seconds into the video; ``0`` plays from the start. */
  start: number
}

/** The shape of every YouTube video id: 11 URL-safe base64 characters. */
const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/

/**
 * ``t`` as YouTube writes it in share links: ``90``, ``90s`` or
 * ``1h2m3s``.
 */
const YOUTUBE_TIME = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/

export function isYouTubeVideoId(id: string | null | undefined): id is string {
  return !!id && YOUTUBE_VIDEO_ID.test(id)
}

/** True when ``src`` is an iframe on either YouTube embed origin. */
export function isYouTubeEmbedUrl(src: string): boolean {
  try {
    return YOUTUBE_EMBED_ORIGINS.includes(new URL(src).origin)
  }
  catch {
    return false
  }
}

function parseStartSeconds(value: string | null): number {
  const match = value ? YOUTUBE_TIME.exec(value) : null
  if (!match) return 0
  const [, hours = '0', minutes = '0', seconds = '0'] = match
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
}

/**
 * The video a YouTube ``/embed/<id>`` iframe plays, or ``null`` for any
 * other ``src``: another origin, a playlist (``/embed/videoseries``),
 * or an id that is not one. ``start`` (the embed's own parameter) wins
 * over ``t`` (the share-link one) when both are present.
 */
export function parseYouTubeEmbed(src: string | null | undefined): YouTubeEmbed | null {
  if (!src || !isYouTubeEmbedUrl(src)) return null

  const url = new URL(src)
  const [, segment, id] = url.pathname.split('/')
  // ``videoseries`` (a playlist) happens to have an id's shape.
  if (segment !== 'embed' || id === 'videoseries' || !isYouTubeVideoId(id)) return null

  return {
    id,
    start: parseStartSeconds(url.searchParams.get('start') ?? url.searchParams.get('t')),
  }
}

/**
 * The privacy-enhanced player for ``video``, set to play at once: it is
 * only ever loaded by the visitor pressing the facade's play button.
 */
export function youTubePlayerUrl(video: YouTubeEmbed): string {
  const url = new URL(`/embed/${video.id}`, YOUTUBE_PLAYER_ORIGIN)
  url.searchParams.set('autoplay', '1')
  if (video.start > 0) url.searchParams.set('start', String(video.start))
  return url.href
}

/** The facade's poster: YouTube's 480x360 frame, which every video has. */
export function youTubeThumbnailUrl(id: string): string {
  return `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${id}/hqdefault.jpg`
}
