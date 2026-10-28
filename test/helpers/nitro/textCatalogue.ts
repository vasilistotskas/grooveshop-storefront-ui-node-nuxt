import { buildTextCatalogue } from '../../../modules/text-catalogue/extract.ts'
import { TEXT_FIXTURE_SOURCE } from '../../fixtures/texts/source.ts'

/**
 * `#text-catalogue` for the `unit` project (`vitest.config.mts` aliases the
 * build's virtual module here): the catalogue of the fixture tree.
 */
export default buildTextCatalogue(TEXT_FIXTURE_SOURCE)
