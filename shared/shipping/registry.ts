/**
 * Registry for {@link ShippingCarrier} adapters.
 *
 * **Mechanism**: explicit imports indexed by ``code``. To add a new
 * courier: create ``./providers/<code>.ts`` exporting a
 * ``ShippingCarrier`` default, then add two lines here (an import
 * and an array entry). The previous ``import.meta.glob`` approach
 * was zero-edit but broke the production build because Nitro's
 * rollup bundler doesn't run Vite's glob transform — and this
 * module is consumed by Nitro server proxies (e.g.
 * ``server/api/shipping/lockers/[provider].get.ts``).
 *
 * Works in both Nuxt app (Vite) and Nitro server (rollup) because
 * the imports are static.
 *
 * **Tests** can use {@link __registerForTest} / {@link __resetForTest}
 * to swap in stubs — the override Map takes priority on lookup.
 */
import type { ShippingCarrier } from './interfaces'
import acsCarrier from './providers/acs'
import boxnowCarrier from './providers/boxnow'

// One line per registered carrier. Adding ELTA / Speedex / Geniki:
// import their adapter above and append to this list.
const _ALL_CARRIERS: ShippingCarrier[] = [
  acsCarrier,
  boxnowCarrier,
]

const _registry: Map<string, ShippingCarrier> = new Map()
for (const carrier of _ALL_CARRIERS) {
  if (_registry.has(carrier.code)) {
    log.warn(
      'shipping/registry',
      `Duplicate carrier code '${carrier.code}' — first registration wins`,
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
