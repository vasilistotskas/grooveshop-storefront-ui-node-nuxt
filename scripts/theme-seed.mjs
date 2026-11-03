#!/usr/bin/env node
/**
 * The one-off move of the existing stores onto the theme document: reads
 * Django's `export_theme_fields` output and writes, for each store, the theme
 * that renders it exactly as its Tenant fields do today (`seedThemeSettings`,
 * `shared/theme/seed.ts`), for Django's `import_themes`.
 *
 *   pnpm theme:seed <export.json> <themes.json>
 *
 * In:  { "stores": [{ "schema": "<schemaName>", "fields": { schemaName, themePreset, primaryColor,
 *        neutralColor, accentHex, successHex, warningHex, errorHex, infoHex, themeMetadata } }] }
 * Out: { "stores": [{ "schema": "<schemaName>", "settings": <the theme's root settings> }] }
 *
 * Every theme it writes is checked against the theme schema; a store whose
 * fields are not as described stops the run, naming it, and nothing is written.
 * `test/unit/shared/theme/seed.spec.ts` holds the seed to the render, token by
 * token.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import * as z from 'zod'
import { seedThemeSettings } from '../shared/theme/seed.ts'
import { zThemeSettings } from '../shared/theme/settings.ts'

const text = z.string()
const zExport = z.object({
  stores: z.array(z.object({
    schema: z.string().min(1),
    fields: z.object({
      schemaName: z.string().min(1),
      themePreset: text,
      primaryColor: text,
      neutralColor: text,
      accentHex: text,
      successHex: text,
      warningHex: text,
      errorHex: text,
      infoHex: text,
      themeMetadata: z.unknown(),
    }),
  })).min(1),
})

/** The seeded themes for an export, or the reason it cannot be read. */
export function seedThemes(input) {
  const exported = zExport.parse(input)
  return {
    stores: exported.stores.map(({ schema, fields }) => {
      if (fields.schemaName !== schema) throw new Error(`${schema}: its fields name the store "${fields.schemaName}"`)
      const settings = seedThemeSettings(fields)
      const checked = zThemeSettings.safeParse(settings)
      if (!checked.success) throw new Error(`${schema}: the seeded theme does not fit the schema: ${checked.error.message}`)
      return { schema, settings: checked.data }
    }),
  }
}

const [, script, from, to] = process.argv
if (script && import.meta.filename === script) {
  if (!from || !to) {
    process.stderr.write('usage: pnpm theme:seed <export.json> <themes.json>\n')
    process.exit(2)
  }
  const themes = seedThemes(JSON.parse(readFileSync(from, 'utf8')))
  writeFileSync(to, `${JSON.stringify(themes, null, 2)}\n`)
  process.stdout.write(`seeded ${themes.stores.map(store => store.schema).join(', ')} into ${to}\n`)
}
