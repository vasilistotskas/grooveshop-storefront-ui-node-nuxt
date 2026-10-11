/** Where a browser error surfaced. */
export type ClientErrorSource = 'vue-error' | 'app-error' | 'window-error' | 'unhandled-rejection'

/**
 * One report as it goes to evlog's client transport. A type alias, not an
 * interface: `log.error` takes a `Record<string, unknown>`, which only an
 * alias satisfies.
 */
export type ClientErrorReport = {
  action: `client:${ClientErrorSource}`
  error: unknown
  /** Vue's lifecycle hint for a component error ("render function", …). */
  info?: string
}

/**
 * Distinct reports one page load may send. A component that throws on
 * every render would otherwise post the same error until the ingest
 * route's rate limit cuts the whole page off, hiding the errors after it.
 */
export const MAX_CLIENT_ERROR_REPORTS = 20

function signatureOf(error: unknown): string {
  if (error instanceof Error) {
    const firstFrame = error.stack?.split('\n').find(line => line.trim().startsWith('at ')) ?? ''
    return `${error.name}:${error.message}:${firstFrame.trim()}`
  }
  return typeof error === 'string' ? error : String(error)
}

/**
 * A reporter that hands each DISTINCT browser error to `send` once per
 * page load, up to `MAX_CLIENT_ERROR_REPORTS`. One error can reach more
 * than one hook (a mount failure is both a Vue error and an app error),
 * and a failing render repeats.
 */
export function createClientErrorReporter(send: (report: ClientErrorReport) => void) {
  const seen = new Set<string>()
  return (source: ClientErrorSource, error: unknown, info?: string) => {
    if (seen.size >= MAX_CLIENT_ERROR_REPORTS) return
    const signature = signatureOf(error)
    if (seen.has(signature)) return
    seen.add(signature)
    send({ action: `client:${source}`, error, ...(info ? { info } : {}) })
  }
}
