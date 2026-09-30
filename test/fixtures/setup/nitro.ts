import { createFetch } from 'ofetch'
import { beforeEach, expect, vi } from 'vitest'
import { NITRO_SHIM_IMPORTS } from '../../helpers/nitro/imports'
import * as runtime from '../../helpers/nitro/runtime'

/**
 * Per-test Nitro state for the `unit` project (see test/helpers/nitro).
 *
 * `$fetch` is not an import in Nitro: the server entry assigns ofetch to
 * `globalThis.$fetch`. Installed here as a real ofetch over the
 * `backendFetch` spy, and again every test because `unstubGlobals`
 * undoes it after each one — which also discards the copy a plugin such
 * as `forwarded-proto` wraps it with. `useBackendFetch()` keeps the
 * `$fetch.create` instance it made from the FIRST test's `$fetch` for the
 * whole file; that is harmless only because every test's `$fetch` sends
 * through the same `backendNetwork` below.
 *
 * `getTenantConfig` keeps an in-memory cache in its module
 * (`server/utils/tenant.ts`); cleared here so a tenant resolved by one
 * test never answers the next one without a backend request. Only for
 * server specs: the module pulls in the generated Zod schemas, and
 * evaluating them in every unit file cost ~40% of the project's time.
 */

const missing = NITRO_SHIM_IMPORTS.filter(name => !(name in runtime))
if (missing.length > 0) {
  throw new Error(`test/helpers/nitro/runtime.ts does not export: ${missing.join(', ')}`)
}

const backendNetwork: typeof fetch = (input, init) => runtime.backendFetch(input, init)

const serverSpec = /[\\/]test[\\/]unit[\\/]server[\\/]/

beforeEach(async () => {
  runtime.resetNitroRuntime()
  if (serverSpec.test(expect.getState().testPath ?? '')) {
    const { clearTenantCache } = await import('../../../server/utils/tenant')
    clearTenantCache()
  }
  vi.stubGlobal('fetch', backendNetwork)
  vi.stubGlobal('$fetch', createFetch({ fetch: backendNetwork }))
})
