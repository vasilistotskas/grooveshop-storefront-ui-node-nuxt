import { describe, it, expect } from 'vitest'
import { capitalize, contentShorten, cleanHtml } from '~/utils/str'

describe('String Utilities', () => {
  describe('capitalize', () => {
    it.each([
      ['hello', 'Hello'],
      ['hello world', 'Hello world'],
      ['Hello', 'Hello'],
      ['a', 'A'],
      ['', ''],
    ])('capitalizes the first letter of %j', (input, expected) => {
      expect(capitalize(input)).toBe(expected)
    })

    it.each([
      ['hello world', 'Hello World'],
      ['hello beautiful world', 'Hello Beautiful World'],
      // Runs of spaces survive: the split is on single spaces.
      ['hello  world', 'Hello  World'],
    ])('capitalizes every word of %j when asked', (input, expected) => {
      expect(capitalize(input, true)).toBe(expected)
    })
  })

  describe('contentShorten', () => {
    it('cuts content longer than the limit and marks the cut', () => {
      expect(contentShorten('This is a long text that needs to be shortened', 0, 10)).toBe('This is a ...')
    })

    it('returns content shorter than the limit untouched', () => {
      expect(contentShorten('Short text', 0, 20)).toBe('Short text')
    })

    it.each([[null], [undefined], ['']])('renders %j as nothing', (content) => {
      expect(contentShorten(content, 0, 20)).toBe('')
    })

    it('uses a custom suffix', () => {
      expect(contentShorten('This is a long text', 0, 10, '---')).toBe('This is a ---')
    })
  })

  describe('cleanHtml', () => {
    it.each([
      ['<p>This is <strong>bold</strong> text</p>', 'This is bold text'],
      ['<p>Hello<br/>world</p>', 'Helloworld'],
      ['<div><span><em>Hello</em></span></div>', 'Hello'],
      ['<p>Hello <strong>world', 'Hello world'],
      // A tag cut off mid-way by an earlier truncation is dropped too.
      ['<p>Hello <stro', 'Hello '],
      ['Plain text', 'Plain text'],
      ['', ''],
    ])('strips the markup of %j', (html, expected) => {
      expect(cleanHtml(html)).toBe(expected)
    })
  })
})
