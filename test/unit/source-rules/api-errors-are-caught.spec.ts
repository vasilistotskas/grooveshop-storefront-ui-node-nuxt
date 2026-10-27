import { describe, expect, it, beforeAll } from 'vitest'
import type { AstNode } from '../../helpers/sourceText'
import { APP, appLabel, callsIn, composableFiles, vueFiles } from '../../helpers/sourceText'

/**
 * A failed `$api` call is handled in a `catch`, never in ofetch's response
 * hooks — in components, pages and the composables both component trees
 * share (which hold most of the calls since the webside consolidation).
 *
 * On a 4xx/5xx ofetch runs `onResponse`, then `onResponseError`, and THEN
 * rejects with the `FetchError`. A hook that toasts the error therefore
 * does not handle it: the rejection still leaves the handler, and UButton,
 * UForm and DynamicForm hand it to Vue's error handler, logging every
 * refusal as an app error — and any `loading = false` after the `await`
 * never runs, leaving the control spinning. `try` / `catch` / `finally`
 * around the awaited call is the one shape that settles every path.
 *
 * A composable may pass hooks on a call it RETURNS (the allauth
 * composables fire `auth:change` from them): the caller awaits it and
 * catches. A hooked call it awaits itself is the same bug as in a
 * component. The frozen `webside` tree is held to the same rule: it
 * renders a live store, and these are bug fixes.
 */
const HOOK = /^on(?:Request|Response)(?:Error)?$/

const hookNames = (options: AstNode | undefined): string[] =>
  options?.type === 'ObjectExpression'
    ? options.properties
        .filter((p: AstNode) => (p.type === 'ObjectProperty' || p.type === 'ObjectMethod') && !p.computed)
        .map((p: AstNode) => p.key.type === 'Identifier' ? p.key.name : p.key.value)
        .filter((name: unknown): name is string => typeof name === 'string' && HOOK.test(name))
    : []

/** The call is what its function returns: `return $api(…)` or `() => $api(…)`. */
function isReturned(call: AstNode, parents: readonly AstNode[]): boolean {
  const parent = parents.at(-1)
  return parent?.type === 'ReturnStatement'
    || (parent?.type === 'ArrowFunctionExpression' && parent.body === call)
}

interface ApiCall { where: string, hooks: string[], returned: boolean }

function apiCalls(files: readonly string[]): ApiCall[] {
  return files.flatMap(file => callsIn(file, /^\$api$/).map(({ call, parents, line }) => ({
    where: `${appLabel(file)}:${line}`,
    hooks: hookNames(call.arguments[1]),
    returned: isReturned(call, parents),
  })))
}

const describeHooked = (calls: readonly ApiCall[]) =>
  calls.map(({ where, hooks }) => `${where} ${hooks.join(', ')}`)

let componentCalls: ApiCall[]
let composableCalls: ApiCall[]

beforeAll(() => {
  componentCalls = apiCalls(vueFiles(APP).filter(file => /^(?:components|pages)\//.test(appLabel(file))))
  composableCalls = apiCalls(composableFiles())
})

describe('`$api` error handling', () => {
  it('finds the calls at all', () => {
    // A guard on the guard: a renamed fetcher must not empty the scan
    // (128 calls across components, pages and composables).
    expect(componentCalls.length + composableCalls.length).toBeGreaterThan(100)
    // The allauth composables' returned, hooked calls: the exemption below
    // must keep matching something, or it has gone blind.
    expect(composableCalls.filter(call => call.hooks.length > 0 && call.returned).length).toBeGreaterThan(20)
  })

  it('components and pages pass no request or response hooks', () => {
    expect(describeHooked(componentCalls.filter(({ hooks }) => hooks.length > 0))).toEqual([])
  })

  it('composables pass hooks only on a call they return', () => {
    expect(describeHooked(composableCalls.filter(({ hooks, returned }) => hooks.length > 0 && !returned))).toEqual([])
  })
})
