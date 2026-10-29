import { describe, expect, it, beforeAll } from 'vitest'
import { appLabel, callsIn, composableFiles, propertyOf, staticText } from '../../helpers/sourceText'

/**
 * A composable reads i18n through `useI18n({ useScope: 'global' })`.
 *
 * Called with no options, `useI18n()` takes the scope of the component it
 * runs in: in a component with its own `<i18n>` block that is the
 * component's local composer, which the component already created, and
 * vue-i18n warns "Duplicate `useI18n` calling by local scope" on every
 * render (thirty-odd components did). The global composer has the same
 * locale; a composable that words something in its caller's messages
 * takes the caller's `t` instead (`useBlogCommentCard`,
 * `useProductDetail`).
 *
 * `useNuxtApp().$i18n` is not the alternative: @nuxtjs/i18n can leave it
 * undefined while a page renders (see `usePageConfig`).
 *
 * `useStoreI18n` is the one composable that takes the local scope, on
 * purpose: it IS the component's `useI18n()`, with the store's texts
 * merged in (store-i18n.spec.ts holds who calls it).
 *
 * Read off the parsed scripts, so a comment cannot trip it.
 */
let calls: Array<{ site: string, scope: string | undefined }>

beforeAll(() => {
  calls = composableFiles().filter(file => !file.endsWith('useStoreI18n.ts')).flatMap(file => callsIn(file, /^useI18n$/).map(({ call, line }) => ({
    site: `${appLabel(file)}:${line}`,
    scope: staticText(propertyOf(call.arguments[0], 'useScope')),
  })))
})

describe('composables and i18n', () => {
  it('reads every composable\'s calls', () => {
    // A guard on the guard: a moved folder must not empty the scan.
    expect(calls.length).toBeGreaterThan(19)
  })

  it('takes the global scope, never the calling component\'s', () => {
    expect(calls.filter(({ scope }) => scope !== 'global').map(({ site }) => site)).toEqual([])
  })
})
