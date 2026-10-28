import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP, readSource, withoutComments } from '../../helpers/sourceText'

/**
 * A failed call tells the shopper the server's reason, not a sentence the
 * component wrote in advance. Every error toast in a `catch` goes through
 * `useApiError().notify` (or `useApiFormErrors().reportFailure`, which
 * calls it), or the checkout's `failCheckout*`; a component that wrote
 * `toast.add({ title: t('x.error'), color: 'error' })` there threw away the
 * reason Django had given (the review that "was not created" because the
 * shopper had not bought the product, 2026-10-19).
 *
 * Exempt, each for a reason a helper cannot serve:
 * - allauth shows each of the server's own messages as its own toast
 *   (`title: error.message`), which is the server's reason already;
 * - a browser WebAuthn failure (a cancelled prompt) is not an API
 *   failure and has its own sentence per cause.
 */
const EXEMPT = new Set([
  'composables/usePasswordResetConfirm.ts',
  'composables/useAddWebAuthnKey.ts',
])

function walk(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter(entry => /\.(vue|ts)$/.test(entry))
    .map(entry => resolve(dir, entry))
}

function balanced(text: string, open: number, opener: string, closer: string): number {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === opener) depth++
    else if (text[i] === closer && --depth === 0) return i
  }
  return -1
}

/** The `toast.add({ … color: 'error' … })` calls inside a `catch` block. */
function errorToastsInCatch(source: string): number[] {
  const found: number[] = []
  for (const catchBlock of source.matchAll(/\bcatch\s*(?:\([^)]*\))?\s*\{/g)) {
    const open = catchBlock.index + catchBlock[0].length - 1
    const close = balanced(source, open, '{', '}')
    const body = source.slice(open, close + 1)
    for (const call of body.matchAll(/toast\.add\(/g)) {
      const end = balanced(body, call.index + call[0].length - 1, '(', ')')
      if (/color:\s*'error'/.test(body.slice(call.index, end + 1))) {
        found.push(source.slice(0, open + call.index).split('\n').length)
      }
    }
  }
  return found
}

const files = walk(APP).map(file => file.replaceAll('\\', '/'))
const rel = (file: string) => file.slice(APP.replaceAll('\\', '/').length + 1)

describe('error toasts in a catch', () => {
  it('are made by the helper, never written by the component', () => {
    const offenders = files
      .filter(file => !EXEMPT.has(rel(file)))
      .flatMap(file => errorToastsInCatch(withoutComments(readSource(file))).map(line => `${rel(file)}:${line}`))

    expect(offenders).toEqual([])
  })

  it('is looking at the code it claims to: the helper is used in many components (a canary)', () => {
    const users = files.filter(file => /\b(notify|reportFailure|failCheckoutWith)\(/.test(readSource(file)))

    // Lowered from 50 as the webside design's copies moved into the
    // composables both trees share: one file now where there were two.
    expect(users.length).toBeGreaterThan(40)
  })

  it('finds a hand-written error toast in a catch', () => {
    const sample = `try { run() }\ncatch (error) {\n  toast.add({ title: t('x.error'), color: 'error' })\n}`

    expect(errorToastsInCatch(sample)).toEqual([3])
  })

  it('does not mistake a success toast, or a toast outside a catch, for one', () => {
    const sample = `try { toast.add({ title: 'ok', color: 'success' }) }\ncatch (error) { notify('a', error) }\ntoast.add({ title: 'no', color: 'error' })`

    expect(errorToastsInCatch(sample)).toEqual([])
  })
})
