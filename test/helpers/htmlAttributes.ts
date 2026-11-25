import { vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { injectHead } from '#imports'

/**
 * Mounts `component`, renders the head into the document and reads
 * `<html>`'s `lang` and `dir`, then drops the entries it added.
 */
export async function renderedHtmlAttributes(component: object, props: Record<string, unknown> = {}) {
  const head = injectHead()
  const before = new Set(head.entries.keys())
  await mountSuspended(component, { route: false, props })
  await flushPromises()
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    head.render()
    vi.runOnlyPendingTimers()
  }
  finally {
    vi.useRealTimers()
  }
  const attributes = {
    lang: document.documentElement.getAttribute('lang'),
    dir: document.documentElement.getAttribute('dir'),
  }
  for (const key of head.entries.keys()) {
    if (!before.has(key)) head.entries.delete(key)
  }
  return attributes
}
