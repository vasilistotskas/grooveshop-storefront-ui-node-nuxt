import { describe, expect, it, beforeAll } from 'vitest'
import type { AstNode } from '../../helpers/sourceText'
import { APP, appLabel, callsIn, vueFiles } from '../../helpers/sourceText'

/**
 * A component or page handles a failed `$api` call in a `catch`, never
 * in ofetch's response hooks.
 *
 * On a 4xx/5xx ofetch runs `onResponse`, then `onResponseError`, and THEN
 * rejects with the `FetchError`. A hook that toasts the error therefore
 * does not handle it: the rejection still leaves the handler, and UButton,
 * UForm and DynamicForm hand it to Vue's error handler, logging every
 * refusal as an app error — and any `loading = false` after the `await`
 * never runs, leaving the control spinning. `try` / `catch` / `finally`
 * around the awaited call is the one shape that settles every path.
 *
 * Composables may still pass hooks when they RETURN the call (the allauth
 * composables fire `auth:change` from them), because their callers catch.
 * The frozen `webside` tree is held to the same rule: it renders a live
 * store, and these are bug fixes.
 */
const HOOK = /^on(?:Request|Response)(?:Error)?$/

const hookNames = (options: AstNode | undefined): string[] =>
  options?.type === 'ObjectExpression'
    ? options.properties
        .filter((p: AstNode) => (p.type === 'ObjectProperty' || p.type === 'ObjectMethod') && !p.computed)
        .map((p: AstNode) => p.key.type === 'Identifier' ? p.key.name : p.key.value)
        .filter((name: unknown): name is string => typeof name === 'string' && HOOK.test(name))
    : []

let calls: Array<{ where: string, hooks: string[] }>

beforeAll(() => {
  calls = vueFiles(APP)
    .filter(file => /^(?:components|pages)\//.test(appLabel(file)))
    .flatMap(file => callsIn(file, /^\$api$/).map(({ call, line }) => ({
      where: `${appLabel(file)}:${line}`,
      hooks: hookNames(call.arguments[1]),
    })))
})

describe('`$api` in components and pages', () => {
  it('finds the calls at all', () => {
    // A guard on the guard: a renamed fetcher must not empty the scan.
    expect(calls.length).toBeGreaterThan(50)
  })

  it('passes no request or response hooks: a failure is handled in a catch', () => {
    const hooked = calls.filter(({ hooks }) => hooks.length > 0).map(({ where, hooks }) => `${where} ${hooks.join(', ')}`)

    expect(hooked).toEqual([])
  })
})
