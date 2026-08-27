import { describe, expect, it } from 'vitest'

import { zTenantConfig } from '../../shared/openapi/zod.gen'
import { validTenantConfig } from '../fixtures/tenantConfig'

/**
 * `server/middleware/0.tenant.ts` validates the upstream resolve
 * response with `parseDataAs(response, zTenantConfig)` on EVERY request.
 * Any test that boots a real Nitro server has to serve a payload that
 * passes, or the tenant never resolves and every request 404s with
 * "Store not found".
 *
 * That failure names neither the schema nor the field that broke it. On
 * 2026-08-27 `TenantConfig` gained a required `agentPaymentInstruments`;
 * the Pinia store's copy of the fixture was updated and the e2e one was
 * not, and the whole e2e suite went red with a 77-second timeout and a
 * 404 that pointed at nothing. Two commits shipped on a red main before
 * the cause was found.
 *
 * This runs in the fast `unit` project with no server, so the next
 * schema change fails in milliseconds and names the field.
 */
describe('the e2e tenant fixture satisfies the generated schema', () => {
  it('parses cleanly through zTenantConfig', () => {
    const result = zTenantConfig.safeParse(validTenantConfig('example.test'))

    // Surface the offending fields rather than a bare boolean — the
    // whole point of this test is to say WHICH field drifted.
    const problems = result.success
      ? []
      : result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)

    expect(problems).toEqual([])
  })

  it('covers every required key, not merely the ones it happens to have', () => {
    // safeParse alone would pass a fixture carrying extra junk; this
    // pins the direction that actually breaks the server.
    const fixture = validTenantConfig('example.test')
    const required = Object.keys(zTenantConfig.shape).filter((key) => {
      const field = zTenantConfig.shape[key as keyof typeof zTenantConfig.shape]
      return !field.safeParse(undefined).success
    })

    const missing = required.filter(key => !(key in fixture))
    expect(missing).toEqual([])
  })
})
