/**
 * sync-schema-yml.mjs
 *
 * Converts openapi/schema.json → openapi/schema.yml and schema.yml (root copy).
 * Both files must stay in sync with openapi/schema.json; this script is the
 * single source of truth for that conversion.
 *
 * Usage:
 *   node scripts/sync-schema-yml.mjs
 *
 * Run after pnpm generate:schema to keep all three files consistent.
 * The CI schema-freshness job runs this and fails if any file drifts.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = join(__dirname, '..')

/**
 * Resolve js-yaml from the pnpm store even though it's a transitive dep.
 * Walks node_modules/.pnpm looking for js-yaml@x.y.z/node_modules/js-yaml.
 */
function resolveJsYaml() {
  const pnpmStore = join(root, 'node_modules', '.pnpm')
  try {
    const entries = readdirSync(pnpmStore)
    const entry = entries.find(e => e.startsWith('js-yaml@'))
    if (entry) {
      const yamlPath = join(pnpmStore, entry, 'node_modules', 'js-yaml', 'index.js')
      const req = createRequire(import.meta.url)
      return req(yamlPath)
    }
  }
  catch {
    // fall through
  }
  throw new Error('js-yaml not found in node_modules/.pnpm — run pnpm install first')
}

try {
  const YAML = resolveJsYaml()
  const jsonPath = join(root, 'openapi', 'schema.json')
  const yamlOpenApiPath = join(root, 'openapi', 'schema.yml')
  const yamlRootPath = join(root, 'schema.yml')

  const schema = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  const yamlContent = YAML.dump(schema, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '\'',
  })

  writeFileSync(yamlOpenApiPath, yamlContent, 'utf-8')
  writeFileSync(yamlRootPath, yamlContent, 'utf-8')

  console.log('schema.yml files synced successfully') // eslint-disable-line no-console
}
catch (error) {
  console.error('Error syncing schema.yml files:', error.message) // eslint-disable-line no-console
  process.exitCode = 1
}
