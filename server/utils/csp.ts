/**
 * CSP nonce helpers.
 *
 * ``generateCspNonce`` creates the per-request nonce the CSP middleware
 * embeds in the ``script-src`` directive; ``stampCspNonce`` injects the
 * matching ``nonce`` attribute into the SSR-emitted markup (used by the
 * ``render:html`` Nitro plugin). Kept as pure functions so both are unit
 * testable outside a Nitro context.
 */

const SCRIPT_TAG_RE = /<script(?![^>]*\snonce=)/g
// Preload hints for scripts are matched against ``script-src`` too, and
// browsers honouring 'strict-dynamic' ignore host/'self' fallbacks — the
// nonce attribute is what keeps modulepreload/preload-as-script working.
const LINK_TAG_RE = /<link(?=[^>]*\srel="?(?:modulepreload|preload|prefetch)"?)(?![^>]*\snonce=)/g

export function generateCspNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16)))
    .toString('base64')
}

export function stampCspNonce(chunk: string, nonce: string): string {
  return chunk
    .replace(SCRIPT_TAG_RE, `<script nonce="${nonce}"`)
    .replace(LINK_TAG_RE, `<link nonce="${nonce}"`)
}
