import { describe, it, expect } from 'vitest'
import { anchorHeadings } from '~/utils/blogHeadings'

/**
 * The "On this page" list of a post: every `<h2>` and `<h3>` gets an id
 * of its own and a place in the list, an `<h3>` under the `<h2>` before
 * it.
 */
describe('anchorHeadings', () => {
  it('numbers the headings in reading order and links each by its id', () => {
    const { html, links } = anchorHeadings('<h2>Πρώτο</h2><p>x</p><h2>Δεύτερο</h2>')

    expect(html).toBe('<h2 id="section-1">Πρώτο</h2><p>x</p><h2 id="section-2">Δεύτερο</h2>')
    expect(links).toEqual([
      { id: 'section-1', depth: 2, text: 'Πρώτο' },
      { id: 'section-2', depth: 2, text: 'Δεύτερο' },
    ])
  })

  it('nests an h3 under the h2 before it', () => {
    const { links } = anchorHeadings('<h2>A</h2><h3>A1</h3><h3>A2</h3><h2>B</h2><h3>B1</h3>')

    expect(links.map(link => [link.text, link.children?.map((child: { text: string }) => child.text)])).toEqual([
      ['A', ['A1', 'A2']],
      ['B', ['B1']],
    ])
  })

  it('keeps an h3 with no h2 before it at the top, and a second one beside it', () => {
    const { links } = anchorHeadings('<h3>One</h3><h3>Two</h3>')

    expect(links.map(link => [link.text, link.children])).toEqual([
      ['One', undefined],
      ['Two', undefined],
    ])
  })

  it('reads the words of a heading with markup and character references in it', () => {
    const { links } = anchorHeadings('<h2><strong>Ισχύς</strong> &amp; <em>ένταση</em></h2>')

    expect(links[0]!.text).toBe('Ισχύς & ένταση')
  })

  it('replaces an id the editor already put on a heading, and keeps its other attributes', () => {
    const { html } = anchorHeadings('<h2 class="lead" id="mine" data-x="1">Τίτλος</h2>')

    expect(html).toBe('<h2 class="lead" data-x="1" id="section-1">Τίτλος</h2>')
  })

  it('leaves a heading with no words in it alone and out of the list', () => {
    const { html, links } = anchorHeadings('<h2> <br> </h2><h2>Πραγματικό</h2>')

    expect(html).toBe('<h2> <br> </h2><h2 id="section-1">Πραγματικό</h2>')
    expect(links.map(link => link.id)).toEqual(['section-1'])
  })

  it('ignores the other heading levels', () => {
    const { html, links } = anchorHeadings('<h1>Τίτλος</h1><h4>Μικρό</h4>')

    expect(html).toBe('<h1>Τίτλος</h1><h4>Μικρό</h4>')
    expect(links).toEqual([])
  })

  it('finds a heading that spans lines', () => {
    const { links } = anchorHeadings('<h2>\n  Δύο\n  γραμμές\n</h2>')

    expect(links[0]!.text).toBe('Δύο γραμμές')
  })
})
