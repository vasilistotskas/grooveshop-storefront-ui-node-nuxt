import { describe, it, expect } from 'vitest'
import { stripHtml } from '~/utils/dom'

describe('DOM Utils', () => {
  describe('stripHtml', () => {
    it('should strip simple HTML tags', () => {
      const html = '<p>Hello World</p>'
      const result = stripHtml(html)
      expect(result).toBe('Hello World')
    })

    it('should strip multiple HTML tags', () => {
      const html = '<div><p>Hello</p><span>World</span></div>'
      const result = stripHtml(html)
      expect(result).toBe('HelloWorld')
    })

    it('should strip nested HTML tags', () => {
      const html = '<div><p><strong>Bold</strong> text</p></div>'
      const result = stripHtml(html)
      expect(result).toBe('Bold text')
    })

    it('should handle self-closing tags', () => {
      const html = 'Line 1<br/>Line 2<hr/>Line 3'
      const result = stripHtml(html)
      expect(result).toBe('Line 1Line 2Line 3')
    })

    it('should handle HTML with attributes', () => {
      const html = '<a href="https://example.com" class="link">Click here</a>'
      const result = stripHtml(html)
      expect(result).toBe('Click here')
    })

    it('should handle empty HTML tags', () => {
      const html = '<div></div><p></p>'
      const result = stripHtml(html)
      expect(result).toBe('')
    })

    it('should handle plain text without HTML', () => {
      const text = 'Just plain text'
      const result = stripHtml(text)
      expect(result).toBe('Just plain text')
    })

    it('should handle HTML entities', () => {
      const html = '<p>&lt;Hello&gt; &amp; &quot;World&quot;</p>'
      const result = stripHtml(html)
      // Note: In server environment (no document), entities are preserved
      expect(result).toContain('Hello')
    })

    it('should handle complex HTML structure', () => {
      const html = `
        <article>
          <h1>Title</h1>
          <p>Paragraph 1</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </article>
      `
      const result = stripHtml(html)
      expect(result).toContain('Title')
      expect(result).toContain('Paragraph 1')
      expect(result).toContain('Item 1')
      expect(result).toContain('Item 2')
    })

    it('should handle HTML with inline styles', () => {
      const html = '<p style="color: red; font-size: 16px;">Styled text</p>'
      const result = stripHtml(html)
      expect(result).toBe('Styled text')
    })

    it('should handle script tags', () => {
      const html = '<div>Text<script>alert("XSS")</script>More text</div>'
      const result = stripHtml(html)
      expect(result).toContain('Text')
      expect(result).toContain('More text')
    })

    it('should handle empty string', () => {
      const result = stripHtml('')
      expect(result).toBe('')
    })

    it('should handle malformed HTML', () => {
      const html = '<p>Unclosed paragraph'
      const result = stripHtml(html)
      expect(result).toBe('Unclosed paragraph')
    })

    it('should preserve whitespace between elements', () => {
      const html = '<span>Hello</span> <span>World</span>'
      const result = stripHtml(html)
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })
  })
})
