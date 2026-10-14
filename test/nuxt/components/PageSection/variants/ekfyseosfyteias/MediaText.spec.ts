import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MediaText from '~/components/PageSection/variants/ekfyseosfyteias/MediaText.vue'

/**
 * The split band. The body is plain text: blank lines make paragraphs
 * and the emphasis phrase becomes a `<strong>` element once. A bullet
 * written `Label: value` prints its label in bold (the funding page's
 * facts); one without the separator is a plain row.
 */
const PROPS = {
  eyebrow: 'Ποιες είμαστε',
  heading: 'Γυναίκες της Φυτειάς, μαζί.',
  body: 'Η πρώτη παράγραφος, με μαρμελάδες.\n\nΗ δεύτερη παράγραφος, επίσης με μαρμελάδες.',
  imageUrl: 'https://assets.example.test/team.jpg',
  note: 'Στον πάγκο μας, στη γιορτή του κάστανου.',
  ctaText: 'Η ιστορία μας',
  ctaLink: '/about',
}

const mountSplit = (props: Record<string, unknown> = {}) =>
  mountSuspended(MediaText, { route: false, props: { ...PROPS, ...props } })

describe('ekfyseosfyteias media_text', () => {
  it('draws the photo with its caption, the h2, and the call to action as a link', async () => {
    const wrapper = await mountSplit()

    expect(wrapper.find('h2').text()).toBe(PROPS.heading)
    expect(wrapper.find('figcaption').text()).toBe(PROPS.note)
    // The note is the alt text; its caption is hidden so it is not read twice.
    expect(wrapper.find('img').attributes('alt')).toBe(PROPS.note)
    expect(wrapper.find('figcaption').attributes('aria-hidden')).toBe('true')
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual([PROPS.ctaText, '/about'])
  })

  it('sets an operation-length title at the smaller heading scale', async () => {
    const short = await mountSplit()
    const long = await mountSplit({
      heading: 'Δράσεις στήριξης υφιστάμενων και νέων κοινωνικών επιχειρήσεων Κ.ΑΛ.Ο. στην Κεντρική Μακεδονία',
    })

    // The size class is the contract here: the display scale set this title in seven lines.
    expect(short.find('h2').classes()).toContain('text-[length:clamp(38px,4.2vw,62px)]')
    expect(long.find('h2').classes()).toContain('text-[length:clamp(28px,2.6vw,36px)]')
    expect(long.find('h2').classes()).not.toContain('text-[length:clamp(38px,4.2vw,62px)]')
  })

  it('gives a photograph without a note an empty alt', async () => {
    const wrapper = await mountSplit({ note: undefined })

    expect(wrapper.find('img').attributes('alt')).toBe('')
    expect(wrapper.find('figcaption').exists()).toBe(false)
  })

  it('splits the body into paragraphs on blank lines', async () => {
    const wrapper = await mountSplit()

    expect(wrapper.findAll('p').map(p => p.text()).filter(text => text.startsWith('Η '))).toEqual([
      'Η πρώτη παράγραφος, με μαρμελάδες.',
      'Η δεύτερη παράγραφος, επίσης με μαρμελάδες.',
    ])
  })

  it('marks only the first occurrence of the emphasis phrase, as an element', async () => {
    const wrapper = await mountSplit({ emphasis: 'μαρμελάδες' })

    const strong = wrapper.findAll('strong')
    expect(strong.map(s => s.text())).toEqual(['μαρμελάδες'])
    expect(strong[0]!.element.closest('p')!.textContent).toBe('Η πρώτη παράγραφος, με μαρμελάδες.')
  })

  it('does not interpret the body as markup', async () => {
    const wrapper = await mountSplit({ body: 'Δοκιμή <b>έντονα</b>', emphasis: undefined })

    expect(wrapper.find('b').exists()).toBe(false)
    expect(wrapper.text()).toContain('<b>έντονα</b>')
  })

  it('prints a "Label: value" bullet with the label in bold and the value beside it', async () => {
    const wrapper = await mountSplit({
      bullets: [{ text: 'Δικαιούχος: Εκ φύσεως Φυτειάς' }, { text: 'Μόνο τιμή' }],
    })

    const [facts, plain] = wrapper.findAll('li')
    expect(facts!.find('strong').text()).toBe('Δικαιούχος')
    expect(facts!.text()).toBe('ΔικαιούχοςΕκ φύσεως Φυτειάς')
    expect(plain!.find('strong').exists()).toBe(false)
    expect(plain!.text()).toBe('Μόνο τιμή')
  })

  it('keeps a value that itself contains a colon whole', async () => {
    const wrapper = await mountSplit({ bullets: [{ text: 'Ώρες: 10:00 – 19:00' }] })

    expect(wrapper.find('li strong').text()).toBe('Ώρες')
    expect(wrapper.find('li').text()).toContain('10:00 – 19:00')
  })

  it('runs as a single text column without a photo, and prints the note under the text', async () => {
    const wrapper = await mountSplit({ imageUrl: undefined })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('figure').exists()).toBe(false)
    expect(wrapper.text()).toContain(PROPS.note)
  })

  it('renders nothing with no heading, text or photo', async () => {
    const wrapper = await mountSuspended(MediaText, { route: false, props: {} })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
