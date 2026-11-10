import { describe, expect, it } from 'vitest'
import {
  builderPageSettingFields,
  builderPageSettingValue,
  builderProblemPageSetting,
  setBuilderPageSetting,
} from '~/utils/builderPageSettings'
import { BUILDER_DOCUMENT_NODE_ID, BUILDER_PAGE_HEADING_MAX_LENGTH } from '~~/shared/constants/builder'
import type { BuilderWorkingCopy } from '~~/shared/types/builderEditor'

/** A home template with an SEO title in the draft and its English translation. */
const home = (): BuilderWorkingCopy => ({
  draft: { settings: { seoTitle: 'Webside: τεχνολογία' }, sections: {}, order: [] },
  i18n: { en: { [BUILDER_DOCUMENT_NODE_ID]: { '/seoTitle': 'Webside: technology' } } },
})

describe('builderPageSettingFields', () => {
  it('offers the heading where the body draws a fallback h1, with the root schema\'s limits', () => {
    expect(builderPageSettingFields('template:home')).toEqual([
      { key: 'seoTitle', maxLength: 70 },
      { key: 'seoDescription', maxLength: 300 },
      { key: 'seoKeywords', maxLength: 255 },
      { key: 'heading', maxLength: BUILDER_PAGE_HEADING_MAX_LENGTH },
    ])
  })

  it('leaves the heading out of a page whose body draws its own title', () => {
    expect(builderPageSettingFields('template:product').map(field => field.key)).toEqual(['seoTitle', 'seoDescription', 'seoKeywords'])
    expect(builderPageSettingFields('page:summer-sale').map(field => field.key)).toEqual(['seoTitle', 'seoDescription', 'seoKeywords'])
  })

  it('has nothing for a document with no page root', () => {
    expect(builderPageSettingFields('group:header')).toEqual([])
    expect(builderPageSettingFields('theme')).toEqual([])
  })
})

describe('builderPageSettingValue', () => {
  it('reads the draft, or the translation into the language being edited', () => {
    expect(builderPageSettingValue(home(), 'seoTitle')).toBe('Webside: τεχνολογία')
    expect(builderPageSettingValue(home(), 'seoTitle', 'en')).toBe('Webside: technology')
    expect(builderPageSettingValue(home(), 'heading', 'en')).toBe('')
  })
})

describe('setBuilderPageSetting', () => {
  it('writes the draft\'s root settings, keeping the others', () => {
    const next = setBuilderPageSetting(home(), 'heading', 'Τεχνολογία με νόημα')

    expect(next.draft.settings).toEqual({ seoTitle: 'Webside: τεχνολογία', heading: 'Τεχνολογία με νόημα' })
    expect(next.i18n).toEqual(home().i18n)
  })

  it('writes a translation under the document\'s own id, leaving the draft alone', () => {
    const next = setBuilderPageSetting(home(), 'heading', 'Technology that makes sense', 'en')

    expect(next.i18n.en?.[BUILDER_DOCUMENT_NODE_ID]).toEqual({ '/seoTitle': 'Webside: technology', '/heading': 'Technology that makes sense' })
    expect(next.draft).toEqual(home().draft)
  })

  it('takes an emptied setting out, and the draft\'s settings with the last one', () => {
    const next = setBuilderPageSetting(home(), 'seoTitle', '')

    expect(next.draft).toEqual({ sections: {}, order: [] })
  })

  it('takes an emptied translation out, so the page falls back to the draft', () => {
    expect(setBuilderPageSetting(home(), 'seoTitle', '', 'en').i18n).toEqual({})
  })
})

describe('builderProblemPageSetting', () => {
  it('names the root setting of a draft problem', () => {
    expect(builderProblemPageSetting('/settings/seoTitle')).toBe('seoTitle')
  })

  it('names the root setting of a translation problem in the language being edited only', () => {
    expect(builderProblemPageSetting(`/i18n/en/${BUILDER_DOCUMENT_NODE_ID}/~1heading`, 'en')).toBe('heading')
    expect(builderProblemPageSetting(`/i18n/en/${BUILDER_DOCUMENT_NODE_ID}/~1heading`, 'el')).toBeUndefined()
    expect(builderProblemPageSetting('/settings/seoTitle', 'en')).toBeUndefined()
  })

  it('ignores a problem on a section', () => {
    expect(builderProblemPageSetting('/sections/hero/settings/title')).toBeUndefined()
  })
})
