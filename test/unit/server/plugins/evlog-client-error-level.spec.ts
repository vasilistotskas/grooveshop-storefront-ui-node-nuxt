import { describe, expect, it } from 'vitest'
import { createError } from 'h3'
import * as z from 'zod'
import plugin from '~~/server/plugins/evlog-client-error-level'
import { parseDataAs } from '~~/server/utils/parser'
import { createTestEvent, loggerOf, runNitroPlugin } from '~~/test/helpers/nitro'
import { abortedRequestBodyError } from '~~/test/helpers/abortedRequestBody'

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

  // A route that did not map it: Nitro wraps the throw in a 500 whose cause
  // is Node's aborted-body error. The client went away; not a fault here.
  it('downgrades a request its client closed to warn, though Nitro made it a 500', async () => {
    const aborted = await abortedRequestBodyError()

    expect(await levelAfter(createError({ statusCode: 500, cause: aborted }))).toBe('warn')
    expect(await levelAfter(aborted)).toBe('warn')
  })

  it('leaves a 500 caused by anything else at error', async () => {
    expect(await levelAfter(createError({ statusCode: 500, cause: new Error('boom') }))).toBeUndefined()
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
