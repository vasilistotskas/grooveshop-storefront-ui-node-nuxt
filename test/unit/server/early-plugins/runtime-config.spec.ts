/**
 * Every request must get its own copy of the boot-resolved runtime config,
 * so Nitro never re-applies the environment to a fresh clone per request
 * (63% of a trivial request's CPU, profiled 2026-09-25).
 */
import { describe, expect, it } from 'vitest'
import plugin from '~~/server/early-plugins/runtime-config'
import { createTestEvent, runNitroPlugin, useRuntimeConfig } from '~~/test/helpers/nitro'

async function requestConfig(nitro: Record<string, unknown> = {}) {
  const event = createTestEvent({ context: { nitro: { errors: [], ...nitro } } })
  await nitroApp.hooks.callHook('request', event)
  return (event.context.nitro as { runtimeConfig: ReturnType<typeof useRuntimeConfig> }).runtimeConfig
}

let nitroApp: Awaited<ReturnType<typeof runNitroPlugin>>

describe('server/early-plugins/runtime-config', () => {
  it('seeds the request with the config resolved at boot', async () => {
    nitroApp = await runNitroPlugin(plugin)

    expect(await requestConfig()).toEqual(useRuntimeConfig())
  })

  it('gives each request its own writable copy', async () => {
    nitroApp = await runNitroPlugin(plugin)
    const first = await requestConfig()
    const second = await requestConfig()

    first.public.djangoHostName = 'changed.test'

    expect(first).not.toBe(useRuntimeConfig())
    expect(second.public.djangoHostName).toBe('platform.test')
    expect(useRuntimeConfig().public.djangoHostName).toBe('platform.test')
  })

  it('never replaces a copy other code already holds', async () => {
    nitroApp = await runNitroPlugin(plugin)
    const existing = { already: true }

    expect(await requestConfig({ runtimeConfig: existing })).toBe(existing)
  })
})
