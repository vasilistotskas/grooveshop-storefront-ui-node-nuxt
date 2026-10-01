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

  /** How many elements carry `id` in `html` — an anchor must be unique. */
  const idCount = (html: string, id: string) =>
    html.split(/\s/).filter(part => part.startsWith(`id="${id}"`)).length

  it('never generates an anchor the document already uses', () => {
    // A merchant's own `id="section-1"` elsewhere: a second element with
    // that id would make the link jump to whichever comes first.
    const { links, html } = buildLegalToc(
      '<h2>Πρώτο</h2><p id="section-1">σημείωση</p>',
    )

    expect(links).toHaveLength(1)
    expect(links[0]!.id).not.toBe('section-1')
    for (const link of links) {
      expect(idCount(html, link.id)).toBe(1)
    }
  })

  it.each([
    ['two headings with the same id', '<h2 id="a">Ένα</h2><h2 id="a">Δύο</h2>'],
    ['a heading reusing an earlier section id', '<section id="a"><h2>Ένα</h2></section><h2 id="a">Δύο</h2>'],
  ])('gives every link its own target for %s', (_case, body) => {
    const { links, html } = buildLegalToc(body)

    expect(new Set(links.map(l => l.id)).size).toBe(2)
    expect(links[1]!.id).not.toBe('a')
    expect(idCount(html, links[1]!.id)).toBe(1)
  })

  it('does not read a data-id as the heading id', () => {
    const { links, html } = buildLegalToc('<h2 data-id="x">Τίτλος</h2>')

    expect(links).toEqual([{ id: 'section-1', text: 'Τίτλος' }])
    expect(html).toBe('<h2 data-id="x" id="section-1">Τίτλος</h2>')
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

  it('lists the sections, not their sub-headings', () => {
    // The jump list is one level deep: an h3 inside a section is part of
    // that section's entry, and is left without an injected anchor.
    const body = '<h2>Δεδομένα</h2><h3>Ποια συλλέγουμε</h3><p>…</p>'
    const { links, html } = buildLegalToc(body)

    expect(links).toEqual([{ id: 'section-1', text: 'Δεδομένα' }])
    expect(html).toBe('<h2 id="section-1">Δεδομένα</h2><h3>Ποια συλλέγουμε</h3><p>…</p>')
  })

  it('lists headings in document order', () => {
    const { links } = buildLegalToc(
      '<section id="c"><h2>Γ</h2></section><section id="a"><h2>Α</h2></section><section id="b"><h2>Β</h2></section>',
    )

    expect(links.map(l => l.id)).toEqual(['c', 'a', 'b'])
  })
})
