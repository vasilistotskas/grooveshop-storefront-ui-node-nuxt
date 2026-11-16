import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { blockFiles } from '../../../../modules/builder-blocks/source.ts'
import { APP } from '../../../helpers/sourceText'
import { realBlocks } from '../../../helpers/realBlocks'

/**
 * `test/helpers/realBlocks.ts` is what every spec that needs the real blocks
 * reads instead of the unit project's fixture `#builder-blocks`: one
 * definition per file the build bundles, found by the module's own
 * `blockFiles` (whose sub-folder rule `source.spec.ts` holds).
 */
describe('the real blocks of the specs', () => {
  it('are one definition for each block file the build bundles, each type once', () => {
    const files = blockFiles(join(APP, 'blocks'))

    // A canary: reading nothing would pass the rest.
    expect(files.length).toBeGreaterThanOrEqual(40)
    expect(realBlocks).toHaveLength(files.length)
    expect(new Set(realBlocks.map(block => block.type)).size).toBe(files.length)
  })
})
