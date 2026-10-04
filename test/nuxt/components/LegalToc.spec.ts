import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import LegalToc from '~/components/LegalToc.vue'

/**
 * The "On this page" list of a legal document: a sticky card of links
 * beside the text on a desktop, one button that opens the same list in a
 * sheet on a phone, the section being read marked, and nothing at all
 * for a document without headings.
 */
const observed = vi.hoisted(() => ({ callback: null as null | ((entries: unknown[]) => void), elements: [] as Element[] }))

const LINKS = [
  { id: 'who', text: '1. Ποιοι είμαστε' },
  { id: 'order', text: '2. Παραγγελία' },
]

beforeEach(() => {
  document.body.innerHTML = '<h2 id="who"></h2><h2 id="order"></h2>'
  observed.callback = null
  observed.elements = []
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: (entries: unknown[]) => void) {
      observed.callback = callback
    }

    observe(element: Element) {
      observed.elements.push(element)
    }

    disconnect() {}
  })
})

const mountToc = (links = LINKS) =>
  mountSuspended(LegalToc, { route: false, props: { title: 'Σε αυτή τη σελίδα', links } })

describe('LegalToc', () => {
  it('lists every heading as a link to its anchor, in a labelled navigation', async () => {
    const wrapper = await mountToc()

    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Σε αυτή τη σελίδα')
    expect(nav.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['1. Ποιοι είμαστε', '#who'],
      ['2. Παραγγελία', '#order'],
    ])
  })

  it('renders nothing for a document without headings', async () => {
    const wrapper = await mountToc([])

    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('watches the headings that are on the page, and none that are not', async () => {
    document.body.innerHTML = '<h2 id="who"></h2>'

    await mountToc()

    expect(observed.elements.map(element => element.id)).toEqual(['who'])
  })

  it('marks the section being read, and only that one', async () => {
    const wrapper = await mountToc()

    observed.callback!([{ isIntersecting: true, intersectionRatio: 0.8, target: observed.elements[1] }])
    await flushPromises()

    const current = wrapper.findAll('nav a[aria-current="location"]')
    expect(current.map(link => link.text())).toEqual(['2. Παραγγελία'])
  })

  it('opens the list in a sheet from one button, and closes it when a link is followed', async () => {
    const wrapper = await mountToc()

    expect(wrapper.findComponent({ name: 'UDrawer' }).props('open')).toBe(false)
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'UDrawer' }).props('open')).toBe(true)
    const sheetLinks = () => [...document.body.querySelectorAll('[role="dialog"] a')]
    expect(sheetLinks().map(link => link.getAttribute('href'))).toEqual(['#who', '#order'])

    ;(sheetLinks()[0] as HTMLElement).click()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'UDrawer' }).props('open')).toBe(false)
  })
})
