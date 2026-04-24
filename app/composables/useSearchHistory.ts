/**
 * Recent-searches history, persisted in localStorage.
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

export function useSearchHistory() {
  const { $i18n } = useNuxtApp()
  const entries = ref<string[]>([])

  function refresh(): void {
    entries.value = readRaw($i18n.locale.value)
  }

  function add(query: string): void {
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

  function remove(query: string): void {
    const normalized = (query ?? '').trim().toLowerCase()
    const next = readRaw($i18n.locale.value).filter(
      item => item.toLowerCase() !== normalized,
    )
    writeRaw($i18n.locale.value, next)
    entries.value = next
  }

  function clear(): void {
    writeRaw($i18n.locale.value, [])
    entries.value = []
  }

  if (import.meta.client) {
    refresh()
  }

  return { entries, refresh, add, remove, clear }
}
