import { describe, expect, it } from 'vitest'
import { builderRichTextIsEmpty, builderRichTextLinkAllowed } from '~/utils/builderRichText'

describe('builderRichTextIsEmpty', () => {
  it('takes an emptied editor\'s paragraphs for no text', () => {
    expect(builderRichTextIsEmpty('')).toBe(true)
    expect(builderRichTextIsEmpty('<p></p>')).toBe(true)
    expect(builderRichTextIsEmpty('<p> &nbsp; </p><p><br></p>')).toBe(true)
  })

  it('keeps text, and markup that shows something without text', () => {
    expect(builderRichTextIsEmpty('<p>Γεια</p>')).toBe(false)
    expect(builderRichTextIsEmpty('<div data-type="horizontalRule"><hr></div>')).toBe(false)
  })
})

describe('builderRichTextLinkAllowed', () => {
  it('takes an https address and a path of the store', () => {
    expect(builderRichTextLinkAllowed('https://example.com/charging')).toBe(true)
    expect(builderRichTextLinkAllowed('/offers')).toBe(true)
    expect(builderRichTextLinkAllowed('/products/12/fortistis?colour=black')).toBe(true)
  })

  it('refuses what the store\'s sanitiser would, and what is not an address', () => {
    expect(builderRichTextLinkAllowed('javascript:alert(1)')).toBe(false)
    expect(builderRichTextLinkAllowed('//evil.example')).toBe(false)
    expect(builderRichTextLinkAllowed('http://example.com')).toBe(false)
    expect(builderRichTextLinkAllowed('https://')).toBe(false)
    expect(builderRichTextLinkAllowed('offers')).toBe(false)
  })
})
