import { describe, expect, it } from 'vitest'
import { builderRichTextLinkAllowed } from '~/utils/builderRichText'

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
