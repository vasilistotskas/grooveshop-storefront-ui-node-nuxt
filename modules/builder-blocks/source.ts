import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/** A block definition file: `app/blocks/<type>.block.ts`, or in a folder below it. */
const BLOCK_FILE = /\.block\.ts$/

/** Every block definition file below `dir`, sorted by path; none when the directory does not exist. */
export function blockFiles(dir: string): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  return entries
    .flatMap(entry => entry.isDirectory()
      ? blockFiles(join(dir, entry.name))
      : BLOCK_FILE.test(entry.name) ? [join(dir, entry.name)] : [])
    .sort()
}

/**
 * The source of the `#builder-blocks` virtual module: the default export
 * of each file, in a list. Only the definitions, which hold data (a
 * schema and its metadata), so no component reaches the server bundle.
 */
export function blocksModuleSource(files: readonly string[]): string {
  const imports = files.map((file, i) => `import block${i} from ${JSON.stringify(file.replaceAll('\\', '/'))}`)
  return `${imports.join('\n')}\nexport default [${files.map((_, i) => `block${i}`).join(', ')}]\n`
}
