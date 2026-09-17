import { describe, expect, it } from 'vitest'
import { buildLegalToc } from '~~/shared/utils/legalToc'

/**
 * These replace three hardcoded `tocLinks` arrays. The bug they exist to
 * prevent shipped: the arrays listed the ids of the boilerplate compiled
 * into each route, so the moment a tenant published its own document the
 * sidebar pointed at anchors that were nowhere on the page.
 */
describe('buildLegalToc', () => {
  const SEEDED = `<section id="scope"><h2>Πεδίο εφαρμογής</h2><p>Ένα.</p></section>
<section id="acceptance"><h2>Αποδοχή των όρων</h2><p>Δύο.</p></section>`

  it('reads the anchors the seeded documents already carry', () => {
    const { links, html } = buildLegalToc(SEEDED)

    expect(links).toEqual([
      { id: 'scope', text: 'Πεδίο εφαρμογής' },
      { id: 'acceptance', text: 'Αποδοχή των όρων' },
    ])
    // Nothing to add — the ids are already targets.
    expect(html).toBe(SEEDED)
  })

  it('prefers an id on the heading over the section it sits in', () => {
    const { links } = buildLegalToc(
      '<section id="outer"><h2 id="inner">Τίτλος</h2></section>',
    )

    expect(links).toEqual([{ id: 'inner', text: 'Τίτλος' }])
  })

  it('injects an anchor when a merchant heading has none', () => {
    // TinyMCE output: headings, no ids anywhere. Without injection every
    // link would be dead, which is exactly the shipped defect.
    const { links, html } = buildLegalToc(
      '<h2>Πρώτο</h2><p>κείμενο</p><h2>Δεύτερο</h2>',
    )

    expect(links).toEqual([
      { id: 'section-1', text: 'Πρώτο' },
      { id: 'section-2', text: 'Δεύτερο' },
    ])
    for (const link of links) {
      expect(html).toContain(`id="${link.id}"`)
    }
  })

  it('gives a second heading in one section its own anchor', () => {
    const { links, html } = buildLegalToc(
      '<section id="one"><h2>Πρώτο</h2><h2>Δεύτερο</h2></section>',
    )

    expect(links.map(l => l.id)).toEqual(['one', 'section-2'])
    expect(html).toContain('id="section-2"')
  })

  it('keeps every link pointing at something that exists', () => {
    const { links, html } = buildLegalToc(
      '<h2>Χωρίς id</h2><section id="με-id"><h2>Με id</h2></section>',
    )

    for (const link of links) {
      expect(html).toContain(`id="${link.id}"`)
    }
  })

  it('strips markup and entities out of the link text', () => {
    const { links } = buildLegalToc(
      '<h2><strong>Όροι</strong> &amp; Προϋποθέσεις</h2>',
    )

    expect(links).toEqual([{ id: 'section-1', text: 'Όροι & Προϋποθέσεις' }])
  })

  it('ignores an empty heading rather than listing a blank link', () => {
    // Numbering counts the headings actually LISTED, not every <h2> in
    // the markup, so the generated ids stay dense.
    const { links } = buildLegalToc('<h2></h2><h2>  </h2><h2>Πραγματικό</h2>')

    expect(links).toEqual([{ id: 'section-1', text: 'Πραγματικό' }])
  })

  it('returns nothing for flat prose, so the sidebar renders nothing', () => {
    expect(buildLegalToc('<p>Μόνο κείμενο.</p>')).toEqual({
      html: '<p>Μόνο κείμενο.</p>',
      links: [],
    })
  })

  it('handles an empty body', () => {
    expect(buildLegalToc('')).toEqual({ html: '', links: [] })
  })

  it('lists headings in document order', () => {
    const { links } = buildLegalToc(
      '<section id="c"><h2>Γ</h2></section><section id="a"><h2>Α</h2></section><section id="b"><h2>Β</h2></section>',
    )

    expect(links.map(l => l.id)).toEqual(['c', 'a', 'b'])
  })
})
