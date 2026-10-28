import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  WEBSIDE_DESIGN,
  appLabel,
  readSource,
  relativeLabel,
  sfcTemplate,
  vueFiles,
  walkElements,
  withoutComments,
} from '../../helpers/sourceText'

/**
 * The reviews UI is ONE implementation for every store (storefront #165).
 *
 * Webside's design keeps its own look, but not its own reviews: its product page, its
 * cards and its "My reviews" page mount the shared components
 * (`ProductReviewsSection`, `ProductRating`, the account body), so a fix
 * lands once. These rules fail the day a copy comes back: a webside file
 * that draws its own stars, or a review component of its own.
 */
const SHARED_SITES: Array<{ file: string, mounts: string[] }> = [
  { file: 'Storefront/ProductDetail.vue', mounts: ['ProductRating', 'ProductReviewsSection'] },
  { file: 'Product/Card.vue', mounts: ['ProductRating'] },
  { file: 'Product/Suggestions.vue', mounts: ['ProductRating'] },
  { file: 'AccountArea/Product/Card.vue', mounts: ['ProductRating'] },
  { file: 'Storefront/Account/OrderDetail.vue', mounts: ['ProductRating'] },
  // The one webside file about reviews: its page frame around the shared body.
  { file: 'AccountArea/Page/Reviews.vue', mounts: ['StorefrontAccountReviews'] },
]

const designFiles = vueFiles(WEBSIDE_DESIGN)

function tagsIn(file: string): Set<string> {
  const tags = new Set<string>()
  walkElements(sfcTemplate(file), node => tags.add(node.tag.replace(/^Lazy/, '')))
  return tags
}

describe('the reviews UI in the webside tree', () => {
  it.each(SHARED_SITES)('mounts the shared $mounts in $file', ({ file, mounts }) => {
    const tags = tagsIn(resolve(WEBSIDE_DESIGN, file))

    for (const mount of mounts) expect(tags, `${file} must render <${mount}>`).toContain(mount)
  })

  it('has no review or rating component of its own', () => {
    const own = designFiles
      .map(file => relativeLabel(WEBSIDE_DESIGN, file))
      .filter(label => /Review|Rating/.test(label))

    expect(own).toEqual(['AccountArea/Page/Reviews.vue'])
  })

  it('draws no stars of its own', () => {
    // A star icon is fine for a loyalty tier or a primary address; it is a
    // review's rating only in a file that reads reviews.
    const offenders = designFiles
      .filter((file) => {
        const source = withoutComments(readSource(file))
        return /UInputRating/.test(source) || (/i-heroicons-star|i-lucide-star/.test(source) && /review(Average|Count)/.test(source))
      })
      .map(appLabel)

    // A canary: the rule must be reading the whole tree, not an empty list.
    expect(designFiles.length).toBeGreaterThan(100)
    expect(offenders).toEqual([])
  })

  it('shows no rating on the model\'s 1..10 scale', () => {
    const offenders = designFiles
      .filter(file => /reviewAverage[^\n]*(?:toFixed|\/\s*10)|\/\{?\s*maxRate/.test(withoutComments(readSource(file))))
      .map(appLabel)

    expect(offenders).toEqual([])
  })
})
