import { vi } from 'vitest'

export type ToastEntry = { id: string | number, [key: string]: unknown }

/**
 * A stand-in for Nuxt UI's `useToast()` that keeps the list the way the
 * real one does, so a spec reads the toast AS IT SHOWS after the calls:
 * `add` with a known id MERGES into the toast showing (a new id joins the
 * list), `update` merges by id, `remove` drops it.
 *
 * ```ts
 * const toast = await vi.hoisted(async () => (await import('~~/test/helpers/toast')).createToastMock())
 * mockNuxtImport('useToast', () => () => toast)
 * ```
 */
export function createToastMock() {
  const toasts = { value: [] as ToastEntry[] }
  const merge = (id: string | number, content: Record<string, unknown>) => {
    const index = toasts.value.findIndex(item => item.id === id)
    if (index === -1) return false
    toasts.value[index] = { ...toasts.value[index]!, ...content }
    return true
  }
  return {
    toasts,
    add: vi.fn((added: ToastEntry) => {
      if (!merge(added.id, added)) toasts.value.push(added)
      return added
    }),
    update: vi.fn((id: string | number, content: Record<string, unknown>) => {
      merge(id, content)
    }),
    remove: vi.fn((id: string | number) => {
      toasts.value = toasts.value.filter(item => item.id !== id)
    }),
    clear: vi.fn(() => {
      toasts.value = []
    }),
    /** The toast `id`, as it shows now. */
    shown: (id: string | number) => toasts.value.find(item => item.id === id),
  }
}
