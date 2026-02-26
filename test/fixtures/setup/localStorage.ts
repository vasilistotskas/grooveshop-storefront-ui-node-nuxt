/**
 * Setup file for the nuxt vitest project.
 *
 * Provides a real Storage implementation for localStorage/sessionStorage in the
 * happy-dom environment used by @nuxt/test-utils. Without this, nuxt-auth-utils'
 * session.client.js calls `localStorage.getItem(...)` on the bare `{}` object
 * that happy-dom exposes when no --localstorage-file is provided, causing:
 *   TypeError: localStorage.getItem is not a function
 *
 * That crash happens BEFORE @nuxtjs/i18n gets to run its plugin, which means
 * nuxtApp.$i18n and the vue-i18n __VUE_I18N_SYMBOL__ are never set, breaking
 * all composable and component tests that rely on i18n.
 *
 * This file is listed in vitest.config.mts under setupFiles for the nuxt project
 * so it runs once per worker before any test file is imported.
 */

class MemoryStorage implements Storage {
  private store: Record<string, string> = {}

  get length(): number {
    return Object.keys(this.store).length
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store)
    return keys[index] ?? null
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]!
      : null
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

// Replace the bare object that happy-dom provides with a real Storage
// implementation so nuxt-auth-utils can call .getItem() without throwing.
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  })
}

if (typeof sessionStorage === 'undefined' || typeof sessionStorage.getItem !== 'function') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  })
}
