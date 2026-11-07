/**
 * Recent-searches history, persisted in localStorage for a visitor who agreed
 * to personalisation (`usePersonalizationConsent`); without that it stays empty.
 *
 * Keyed per locale so Greek and English history stay separate when the
 * English locale is eventually enabled. FIFO cap keeps the list cheap to
 * render in the search modal empty state.
 */

const STORAGE_KEY_PREFIX = 'search:recent'
const MAX_ENTRIES = 8
const MIN_QUERY_LENGTH = 2

function storageKey(locale: string): string {
  return `${STORAGE_KEY_PREFIX}:${locale || 'default'}`
}

function readRaw(locale: string): string[] {
  if (!import.meta.client) return []
  try {
    const raw = window.localStorage.getItem(storageKey(locale))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  }
  catch {
    return []
  }
}

function writeRaw(locale: string, entries: string[]): void {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(storageKey(locale), JSON.stringify(entries))
  }
  catch {
    // Quota/security errors — history is a nice-to-have, swallow silently.
  }
}

/** Remove the history of every locale from this browser. */
export function forgetSearchHistory(): void {
  if (!import.meta.client) return
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    for (const key of keys) {
      if (key?.startsWith(`${STORAGE_KEY_PREFIX}:`)) window.localStorage.removeItem(key)
    }
  }
  catch {
    // Storage blocked: then nothing was kept in it.
  }
}

export function useSearchHistory() {
  const { $i18n } = useNuxtApp()
  const allowed = usePersonalizationConsent()
  // Shared: a page can hold two search modals, and clearing in one must not
  // leave the queries showing in the other.
  const entries = useState<string[]>('search-history:entries', () => [])

  function refresh(): void {
    entries.value = allowed.value ? readRaw($i18n.locale.value) : []
  }

  function add(query: string): void {
    if (!allowed.value) return
    const trimmed = (query ?? '').trim()
    if (trimmed.length < MIN_QUERY_LENGTH) return
    const normalized = trimmed.toLowerCase()
    const existing = readRaw($i18n.locale.value).filter(
      item => item.toLowerCase() !== normalized,
    )
    const next = [trimmed, ...existing].slice(0, MAX_ENTRIES)
    writeRaw($i18n.locale.value, next)
    entries.value = next
  }

  function clear(): void {
    forgetSearchHistory()
    entries.value = []
  }

  if (import.meta.client) {
    refresh()
    watch(allowed, refresh)
  }

  return { entries, refresh, add, clear }
}
