/**
 * nuxt-ai-ready's discovery surfaces: `/llms.txt`, `/llms-full.txt` and a
 * page's `.md` mirror. Only the platform storefront serves them
 * (`server/middleware/1.ai-ready-gate.ts`); every other store answers 404.
 */
export function isAiSurfacePath(path: string): boolean {
  return path === '/llms.txt'
    || path === '/llms-full.txt'
    || (path.endsWith('.md') && !path.startsWith('/api/'))
}

/** Whether the store serves the surfaces: its row flag, never its hostname. */
export function servesAiSurfaces(tenant: { isPlatformStorefront?: boolean } | null | undefined): boolean {
  return tenant?.isPlatformStorefront === true
}

/**
 * A `Link` header without the links that point at those surfaces, so a
 * store that answers them with 404 does not advertise them: the module
 * sends a page's `.md` twin and `/llms.txt` on every response. `''` when
 * nothing is left. Link values are split where the next one opens with
 * `<`, which an encoded URL never contains.
 */
export function withoutAiSurfaceLinks(header: string): string {
  return header
    .split(/,\s*(?=<)/)
    .filter((link) => {
      const target = /^\s*<([^>]*)>/.exec(link)?.[1]
      if (!target) return true
      const path = URL.canParse(target) ? new URL(target).pathname : target
      return !isAiSurfacePath(path)
    })
    .join(', ')
}
