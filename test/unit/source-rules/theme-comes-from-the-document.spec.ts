import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO, readSource, withoutComments } from '../../helpers/sourceText'

/**
 * A store's look has ONE source: the theme document of its current release
 * (`requestStoreTheme`, `themeCss`, `themeColorOf`). The Tenant row still
 * carries the fields the theme replaced (`TenantConfig.primaryColor` and the
 * rest, until Django drops them), and nothing in the storefront may read them:
 * a second answer would disagree with the page the day a store edits its theme.
 * The generated types in `shared/openapi/` and the test fixtures that fill the
 * payload are not readers.
 */
const TENANT_THEME_FIELDS = ['primaryColor', 'neutralColor', 'accentHex', 'successHex', 'warningHex', 'errorHex', 'infoHex', 'themePreset', 'themeMetadata']

const slashed = (path: string) => path.replaceAll('\\', '/')

function sources(dir: string): string[] {
  const root = resolve(REPO, dir)
  return (readdirSync(root, { recursive: true }) as string[])
    .map(entry => resolve(root, entry))
    .filter(file => /\.(ts|vue)$/.test(file))
}

const files = [...sources('app'), ...sources('server'), ...sources('shared').filter(file => !slashed(file).includes('/shared/openapi'))]
const label = (file: string) => slashed(file).replace(`${slashed(REPO)}/`, '')

describe('the theme comes from the document, not the Tenant row', () => {
  // A canary: the scan must see the code it guards.
  it('scans the plugin that draws the theme', () => {
    expect(files.map(label)).toContain('server/plugins/tenant-theme.ts')
    expect(files.length).toBeGreaterThan(500)
  })

  it.each(TENANT_THEME_FIELDS)('reads no `%s`', (field) => {
    const pattern = new RegExp(`\\b${field}\\b`)
    const offenders = files.filter(file => pattern.test(withoutComments(readSource(file)))).map(label)

    expect(offenders).toEqual([])
  })
})
