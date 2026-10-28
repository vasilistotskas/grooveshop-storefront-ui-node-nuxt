import { beforeAll, describe, expect, it } from 'vitest'
import { APP, appLabel, callsIn, parseSfc, staticText, vueFiles } from '../../helpers/sourceText'

/**
 * A component with its own `<i18n lang="yaml">` block takes its `t` from
 * `useStoreI18n('<its path under app/, without .vue>')`, never from a bare
 * `useI18n()`.
 *
 * A store's edited texts are merged over the block's by that call
 * (`app/composables/useStoreI18n.ts`), under the namespace the text
 * catalogue gives the block (`modules/text-catalogue`). A component that
 * kept `useI18n()` would show the defaults whatever the store saved; a
 * namespace that is not the file's own path would read another
 * component's overrides, or none, and the store's editor would offer a
 * text that never appears. The frozen webside tree is covered like the
 * rest: with no overrides it renders as it did (`frozen-render.spec.ts`).
 *
 * Read off the parsed scripts, so a comment or a string cannot trip it.
 */
const namespaceOf = (file: string) => appLabel(file).replace(/\.vue$/, '')

let blockFiles: string[]

beforeAll(() => {
  blockFiles = vueFiles(APP).filter(file => parseSfc(file).customBlocks.some(({ type }) => type === 'i18n'))
})

describe('components with an <i18n> block', () => {
  it('are found', () => {
    // A guard on the guard: a moved tree must not empty the scan.
    // 441 on 2026-10-28; raise the floor when a block is added.
    expect(blockFiles.length).toBeGreaterThanOrEqual(441)
    expect(blockFiles.map(namespaceOf)).toContain('components/variants/webside/Chrome/CheckoutHeader')
  })

  it('never call useI18n()', () => {
    const offenders = blockFiles.filter(file => callsIn(file, /^useI18n$/).length > 0).map(appLabel)

    expect(offenders).toEqual([])
  })

  it('call useStoreI18n once, with their own path', () => {
    const wrong = blockFiles.flatMap((file) => {
      const calls = callsIn(file, /^useStoreI18n$/)
      const namespaces = calls.map(({ call }) => staticText(call.arguments[0]))
      return namespaces.length === 1 && namespaces[0] === namespaceOf(file)
        ? []
        : [`${appLabel(file)}: ${JSON.stringify(namespaces)}`]
    })

    expect(wrong).toEqual([])
  })
})
