import { describe, expect, it } from 'vitest'
import { COMPONENTS, appLabel, readSource, vueFiles, withoutComments } from '../../helpers/sourceText'

// Product photographs ask for no quality: they are AVIF, and AVIF's quality
// is the media service's ceiling (`MEDIA_STREAM_AVIF_QUALITY`, applied by the
// one URL builder). A number written on a card or gallery image was ignored
// by the service (it clamps at its own cap) while looking like a decision.
// The zoom's PNG (`ImageModal`) is the one image with a quality of its own.
const PRODUCT_IMAGE_FILES = /(^|\/)Products?\/(Card|Image|VariantSelector)\.vue$|AccountArea\/Product\/Card\.vue$/

const NAMES_A_QUALITY = /\bquality(=|:\s*)["']?\w+/

describe('product image quality', () => {
  const files = vueFiles(COMPONENTS).filter(file => PRODUCT_IMAGE_FILES.test(appLabel(file)))

  it('finds the product image components of both designs', () => {
    expect(files.length).toBeGreaterThanOrEqual(7)
  })

  it('names no quality on an AVIF product photograph', () => {
    const offenders = files.filter(file => NAMES_A_QUALITY.test(withoutComments(readSource(file))))

    expect(offenders.map(appLabel)).toEqual([])
  })
})
