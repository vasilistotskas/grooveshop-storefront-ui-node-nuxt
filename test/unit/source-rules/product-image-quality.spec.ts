import { describe, expect, it } from 'vitest'
import { COMPONENTS, appLabel, readSource, vueFiles, withoutComments } from '../../helpers/sourceText'

// Product photographs ask the media service for the quality a use needs,
// from PRODUCT_CARD_IMAGE_QUALITY or PRODUCT_IMAGE_QUALITY, in every design.
// The webside cards and gallery had a literal 100 of their own: the LCP image
// of the products listing was 60 KB for a 420px tile.
const PRODUCT_IMAGE_FILES = /(^|\/)Products?\/(Card|Image|ImageModal|VariantSelector)\.vue$/

const BOUND_TO_A_TOKEN = /:quality="[A-Z_]+"/g
const WRITTEN_AS_A_NUMBER = /\bquality(=|:\s*)["']?\d+/

describe('product image quality', () => {
  const files = vueFiles(COMPONENTS).filter(file => PRODUCT_IMAGE_FILES.test(appLabel(file)))

  it('finds the product image components of both designs', () => {
    expect(files.length).toBeGreaterThanOrEqual(8)
  })

  it('never writes the quality as a number', () => {
    const literal = files.filter(file =>
      WRITTEN_AS_A_NUMBER.test(withoutComments(readSource(file)).replace(BOUND_TO_A_TOKEN, '')),
    )

    expect(literal.map(appLabel)).toEqual([])
  })
})
