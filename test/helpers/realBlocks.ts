import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { blockFiles } from '../../modules/builder-blocks/source.ts'
import type { BlockDefinition } from '../../shared/types/builder'
import { APP } from './sourceText'

/**
 * Every REAL block definition of this build, found the way the build finds
 * them: `modules/builder-blocks`' own `blockFiles` over `app/blocks`, sub-folders
 * included, each file's default export. The `unit` project aliases
 * `#builder-blocks` to a fixture set, so a spec that needs the real blocks
 * (the catalogue snapshots, the seeds, the upgrades, the labels) reads them
 * here, never through a glob of its own that could miss a file the server
 * bundles. In file order.
 */
export const realBlocks: readonly BlockDefinition[] = await Promise.all(
  blockFiles(join(APP, 'blocks')).map(async file => (await import(pathToFileURL(file).href) as { default: BlockDefinition }).default),
)
