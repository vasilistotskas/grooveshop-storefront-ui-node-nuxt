import { describe, expect, it } from 'vitest'
import { applyData, dataSites, planData } from '~~/shared/builder/data'
import { parseDocument } from '~~/shared/builder/document'
import { sectionProps } from '~~/shared/builder/props'
import { buildBlockCatalogue } from '~~/server/utils/builderCatalogue'
import { legacyImageRefs } from '~~/server/utils/builderData/legacyImages'
import { makeResolvedAsset } from '~~/test/fixtures/media'
import type { BlockDefinition, BuilderDocument, BuilderNode } from '~~/shared/types/builder'
import type { DataResolution } from '~~/shared/types/builderData'

/** The REAL blocks of `app/blocks`: the adapter is held to what each declares. */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
const registry = new Map(definitions.map(block => [block.type, block]))

const node = (type: string, settings: Record<string, unknown>, extra: Partial<BuilderNode> = {}): BuilderNode => ({ type, settings, ...extra })
const documentOf = (sections: Record<string, BuilderNode>): BuilderDocument => ({ sections, order: Object.keys(sections) })
const only = (document: BuilderDocument) => document.sections.a!

const ok = (path: string, alt = '') => ({ status: 'ok', value: { path, alt } })

const noRecords = (media: Map<number, unknown> = new Map()): DataResolution => ({
  records: { product: new Map(), blogPost: new Map(), category: new Map(), blogCategory: new Map(), media },
  queries: new Map(),
})

describe('legacyImageRefs', () => {
  it('hands an old URL and its alt text on as a resolved reference, and takes both out of the props', () => {
    const adapted = legacyImageRefs(documentOf({ a: node('hero_banner@2', { heading: 'H', imageUrl: 'https://cdn.test/hero.jpg', mobileImageUrl: 'https://cdn.test/hero-m.jpg', imageAlt: 'A shopfront' }) }), registry)

    expect(only(adapted).settings).toEqual({
      heading: 'H',
      image: ok('https://cdn.test/hero.jpg', 'A shopfront'),
      mobileImage: ok('https://cdn.test/hero-m.jpg'),
    })
  })

  it('reads the alt text it finds, so a translated one (the overlay is merged before) comes out translated', () => {
    const adapted = legacyImageRefs(documentOf({ a: node('hero_banner@2', { imageUrl: 'https://cdn.test/hero.jpg', imageAlt: 'Μια βιτρίνα' }) }), registry)

    expect(only(adapted).settings.image).toEqual(ok('https://cdn.test/hero.jpg', 'Μια βιτρίνα'))
  })

  it('ignores the old setting of a node whose new one is present, whatever the new one resolved to', () => {
    for (const image of [{ status: 'ok', value: makeResolvedAsset() }, { status: 'missing' }, { status: 'failed' }]) {
      const adapted = legacyImageRefs(documentOf({ a: node('hero_banner@2', { image, imageUrl: 'https://cdn.test/old.jpg', imageAlt: 'old' }) }), registry)

      expect(only(adapted).settings).toEqual({ image })
    }
  })

  it('adds nothing to a node with no image at all, or an empty URL', () => {
    const adapted = legacyImageRefs(documentOf({ a: node('hero_banner@2', { heading: 'H', imageUrl: '' }) }), registry)

    expect(only(adapted).settings).toEqual({ heading: 'H' })
  })

  it('makes a reference of every entry of an old list, keeping the position of an empty one', () => {
    const adapted = legacyImageRefs(documentOf({ a: node('hero_carousel@1', { images: ['https://cdn.test/1.jpg', '', 'https://cdn.test/3.jpg'], mobileImages: ['https://cdn.test/1m.jpg'] }) }), registry)

    expect(only(adapted).settings).toEqual({
      artworks: [ok('https://cdn.test/1.jpg'), { status: 'missing' }, ok('https://cdn.test/3.jpg')],
      mobileArtworks: [ok('https://cdn.test/1m.jpg')],
    })
  })

  it('reaches the blocks inside a section', () => {
    const slide = node('hero_slide@2', { imageUrl: 'https://cdn.test/s.jpg', alt: 'Slide' })
    const adapted = legacyImageRefs(documentOf({ a: node('hero_carousel@1', {}, { blocks: { s: slide }, blockOrder: ['s'] }) }), registry)

    expect(only(adapted).blocks!.s!.settings).toEqual({ image: ok('https://cdn.test/s.jpg', 'Slide') })
  })

  it('leaves a block that declares nothing as it is', () => {
    const document = documentOf({ a: node('rich_text@1', { body: 'x' }) })

    expect(legacyImageRefs(document, registry)).toEqual(document)
  })

  it.each([
    ['hero_banner@2', { imageUrl: 'u' }, 'image', ''],
    ['hero_slide@2', { imageUrl: 'u' }, 'image', ''],
    ['gallery_image@1', { src: 'u', alt: 'a' }, 'image', 'a'],
    ['media_text@2', { imageUrl: 'u' }, 'image', ''],
    ['trust_badge@1', { kind: 'custom', label: 'L', imageUrl: 'u' }, 'image', ''],
    ['testimonial@1', { avatar: 'u' }, 'avatarImage', ''],
  ])('gives %s the shape of a reference under its new name', (type, settings, to, alt) => {
    const adapted = only(legacyImageRefs(documentOf({ a: node(type, settings) }), registry))

    expect(adapted.settings[to]).toEqual(ok('u', alt))
    expect(Object.keys(adapted.settings)).not.toEqual(expect.arrayContaining(['imageUrl']))
    expect(Object.keys(adapted.settings)).not.toEqual(expect.arrayContaining(['src']))
    expect(Object.keys(adapted.settings)).not.toEqual(expect.arrayContaining(['avatar']))
  })
})

describe('a page whose documents hold only the old URLs', () => {
  it('parses against the new schemas and reaches its component with no old setting and one image shape', () => {
    const stored = documentOf({
      a: node('hero_carousel@1', { images: ['https://cdn.test/1.jpg'] }, {
        blocks: { s: node('hero_slide@2', { imageUrl: 'https://cdn.test/s.jpg', alt: 'Slide' }) },
        blockOrder: ['s'],
      }),
    })
    const parsed = parseDocument(stored, 'page', registry, { featureOn: () => true })
    // No data settings at all: this page never reaches `applyData`.
    expect(dataSites(parsed, registry)).toEqual([])

    const adapted = legacyImageRefs(parsed, registry)

    expect(sectionProps(only(adapted), registry)).toEqual({
      artworks: [ok('https://cdn.test/1.jpg')],
      slides: [{ image: ok('https://cdn.test/s.jpg', 'Slide') }],
    })
  })
})

describe('a media reference inside a list, end to end', () => {
  const parsed = parseDocument(documentOf({
    a: node('hero_carousel@1', { artworks: [3, 4], mobileArtworks: [5] }),
  }), 'page', registry, { featureOn: () => true })

  it('is a data site at each entry', () => {
    expect(dataSites(parsed, registry).map(({ pointer, value }) => [pointer, value])).toEqual([
      ['/artworks/0', 3],
      ['/artworks/1', 4],
      ['/mobileArtworks/0', 5],
    ])
  })

  it('is one read of the media ids, once each', () => {
    expect(planData(dataSites(parsed, registry)).ids.media).toEqual([3, 4, 5])
  })

  it('is replaced entry by entry, an asset that is gone as `missing`, and the entry kept', () => {
    const asset = makeResolvedAsset({ id: 3 })
    const { document, issues } = applyData(parsed, registry, noRecords(new Map([[3, asset], [5, makeResolvedAsset({ id: 5 })]])))

    expect(only(document).settings.artworks).toEqual([{ status: 'ok', value: asset }, { status: 'missing' }])
    expect(issues.map(({ pointer, status }) => [pointer, status])).toEqual([['/artworks/1', 'missing']])
  })

  it('is stated in the catalogue at the `*` pointer', () => {
    const block = buildBlockCatalogue(definitions).blocks.find(({ type }) => type === 'hero_carousel')!

    expect(block.data).toMatchObject({
      '/artworks/*': { field: 'ref', kind: 'media', onMissing: 'empty' },
      '/mobileArtworks/*': { field: 'ref', kind: 'media', onMissing: 'empty' },
    })
  })
})
