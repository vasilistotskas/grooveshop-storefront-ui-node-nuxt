/**
 * sync-allauth-schema.mjs
 *
 * Copies Django's `allauth-schema.yml` (the OpenAPI document of allauth's
 * headless API, committed at the Django repo's root) to
 * `openapi/allauth-schema.yml`, the second input of `openapi-ts.config.ts`.
 * The file is Django's, byte for byte: it is never edited here.
 *
 * Usage:
 *   node scripts/sync-allauth-schema.mjs [path/to/allauth-schema.yml]
 *
 * Without an argument it reads `$GROOVESHOP_DJANGO_DIR/allauth-schema.yml`
 * (default: `../grooveshop-django-api`, the sibling checkout). Run
 * `pnpm openapi-ts` afterwards.
 */

import { copyFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(
  process.argv[2]
  ?? join(process.env.GROOVESHOP_DJANGO_DIR ?? join(root, '..', 'grooveshop-django-api'), 'allauth-schema.yml'),
)

try {
  copyFileSync(source, join(root, 'openapi', 'allauth-schema.yml'))
  console.log(`allauth-schema.yml synced from ${source}`)
}
catch (error) {
  console.error('Error syncing allauth-schema.yml:', error.message)
  process.exitCode = 1
}
