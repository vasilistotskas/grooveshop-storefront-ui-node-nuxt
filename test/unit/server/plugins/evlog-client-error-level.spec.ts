import { describe, expect, it } from 'vitest'
import { createError } from 'h3'
import * as z from 'zod'
import plugin from '~~/server/plugins/evlog-client-error-level'
import { parseDataAs } from '~~/server/utils/parser'
import { createTestEvent, loggerOf, runNitroPlugin } from '~~/test/helpers/nitro'

/**
 * A 4xx is the client's doing and is logged at `warn`; a 5xx, and a
 * response that failed its own schema (a 422 that is OUR fault), stay at
 * evlog's default `error`.
 */
async function levelAfter(error: unknown) {
  const nitroApp = await runNitroPlugin(plugin)
  const event = createTestEvent()
  await nitroApp.hooks.callHook('error', error, { event })
  return loggerOf(event).level
}

describe('server/plugins/evlog-client-error-level', () => {
  it.each([404, 401, 400])('downgrades a %s to warn', async (statusCode) => {
    expect(await levelAfter(createError({ statusCode }))).toBe('warn')
  })

  it('leaves a 5xx at error', async () => {
    expect(await levelAfter(createError({ statusCode: 502 }))).toBeUndefined()
  })

  it('leaves a response contract failure at error, although it is a 422', async () => {
    const drift = await parseDataAs({ id: 'x' }, z.object({ id: z.number() })).catch((error: unknown) => error)

    expect(await levelAfter(drift)).toBeUndefined()
  })

  it('does nothing for an error raised before evlog attached its logger', async () => {
    const nitroApp = await runNitroPlugin(plugin)
    const event = createTestEvent({ context: { log: undefined } })

    await expect(nitroApp.hooks.callHook('error', createError({ statusCode: 404 }), { event })).resolves.toBeUndefined()
  })
})
