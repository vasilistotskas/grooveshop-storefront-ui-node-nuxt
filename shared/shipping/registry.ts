/**
 * Auto-discovered registry for {@link ShippingCarrier} adapters.
 *
 * **Mechanism**: ``import.meta.glob`` with ``{ eager: true,
 * import: 'default' }`` pulls every ``./providers/*.ts`` file at
 * build time. Each file's default export is a {@link ShippingCarrier}
 * instance and it gets indexed by ``code``. To add a new courier:
 * drop ``./providers/<code>.ts``. No edits to this file or any
 * consumer.
 *
 * Works in both Nuxt app (browser/SSR) and Nitro server (server
 * proxies) because this module lives in ``shared/`` — both
 * contexts auto-import from here per ``nuxt.config.ts`` and the
 * Nitro ``imports.dirs``.
 *
 * **Tests** can use {@link __registerForTest} / {@link __resetForTest}
 * to swap in stubs — the eager glob keeps the real adapters loaded,
 * the override Map takes priority on lookup.
 */
import type { ShippingCarrier } from './interfaces'

const _eager = import.meta.glob<ShippingCarrier>(
  './providers/*.ts',
  { eager: true, import: 'default' },
)

const _registry: Map<string, ShippingCarrier> = new Map()

for (const [path, carrier] of Object.entries(_eager)) {
  if (!carrier || typeof carrier !== 'object' || !('code' in carrier)) {
    log.warn('shipping/registry', `Skipping ${path}: default export is not a ShippingCarrier`)
    continue
  }
  if (_registry.has(carrier.code)) {
    log.warn(
      'shipping/registry',
      `Duplicate carrier code '${carrier.code}' from ${path} — first wins`,
    )
    continue
  }
  _registry.set(carrier.code, carrier)
}

const _overrides: Map<string, ShippingCarrier> = new Map()

/** Look up a carrier by its ``ShippingProvider.code`` — returns
 *  ``null`` when no adapter is registered (e.g. a backend that
 *  exposes a provider this build doesn't know about yet). */
export function getCarrier(code: string | null | undefined): ShippingCarrier | null {
  if (!code) return null
  return _overrides.get(code) ?? _registry.get(code) ?? null
}

/** Iterate every registered carrier in the order their files were
 *  globbed. Stable across builds because Vite sorts the glob keys. */
export function listCarriers(): ShippingCarrier[] {
  // Overrides take priority but we still surface base carriers that
  // weren't stubbed.
  const merged = new Map(_registry)
  for (const [code, carrier] of _overrides) {
    merged.set(code, carrier)
  }
  return [...merged.values()]
}

/** Type guard: does this string match a registered carrier? Useful
 *  in Zod refinements that need to tell `box_now_locker` (registered)
 *  apart from `home_delivery` (no carrier — ships through any
 *  ``supports_home_delivery`` provider). */
export function isCarrierCode(value: unknown): value is string {
  return typeof value === 'string' && getCarrier(value) !== null
}

/** Test seam — register a stub adapter that wins over the file-based
 *  registry until {@link __resetForTest} runs. NEVER call from app
 *  code. */
export function __registerForTest(carrier: ShippingCarrier): void {
  _overrides.set(carrier.code, carrier)
}

/** Test seam — clear all stubs. Call in ``afterEach``. */
export function __resetForTest(): void {
  _overrides.clear()
}
