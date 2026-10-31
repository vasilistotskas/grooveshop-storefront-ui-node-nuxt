import { describe, it, expect } from 'vitest'
import { APP, appLabel, parseSfc, vueFiles } from '../../helpers/sourceText'

/**
 * Whether to offer a language switcher is the TENANT's question
 * (`tenantStore.isMultilingual`, `availableLocales`), not the platform's.
 *
 * `useI18n().locales` lists every locale the BUILD knows, for every
 * store. webside serves one, but its navbars asked `locales.length > 1`
 * (`el` and `en`): true, so the switcher component loaded its whole
 * select stack (SelectMenu, Combobox, Listbox, Popper: about 31 KB
 * compressed on every page) to render nothing, since the switcher itself
 * answers from the tenant.
 */
describe('the language switcher', () => {
  it('is never gated on the platform-wide locale list', () => {
    const offenders: string[] = []
    let read = 0
    for (const file of vueFiles(APP)) {
      const template = parseSfc(file).template?.content ?? ''
      read += template ? 1 : 0
      template.split('\n').forEach((line, index) => {
        if (/(?<![A-Za-z])locales\.length/.test(line)) offenders.push(`${appLabel(file)}:${index + 1}`)
      })
    }

    expect(read, 'the walker must still read templates').toBeGreaterThan(300)
    expect(offenders, 'gate on tenantStore.isMultilingual').toEqual([])
  })
})
