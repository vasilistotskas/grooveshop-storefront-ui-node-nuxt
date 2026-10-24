import { afterEach, describe, expect, it } from 'vitest'
import { createPressLog, elementSelector } from '~/utils/inpReport'

/**
 * `createPressLog` notes the control each press landed on while it is still
 * in the page, for an interaction whose element web-vitals can no longer
 * see (storefront #156: most of webside's slow product-page taps).
 */

function mount(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  return root
}

function press(target: Element, timeStamp: number, type = 'pointerdown'): Event {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'target', { value: target })
  Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('elementSelector', () => {
  it('writes the path the way web-vitals does: tags and sorted classes, up to the first id', () => {
    const root = mount('<section id="pdp"><div class="b a"><button class="rounded-md px-2">Add</button></div></section>')

    expect(elementSelector(root.querySelector('button')!)).toBe('#pdp>div.a.b>button.px-2.rounded-md')
  })

  it('stays within web-vitals\' 100 characters, keeping the nearest element', () => {
    const classes = Array.from({ length: 4 }, (_, i) => `utility-class-${i}`).join(' ')
    const root = mount(`<div class="${classes}"><div class="${classes}"><button class="${classes}">x</button></div></div>`)

    const selector = elementSelector(root.querySelector('button')!)

    expect(selector.length).toBeLessThanOrEqual(100)
    expect(selector.startsWith('button.')).toBe(true)
  })

  // The ingest drops a target over 100 characters, so a heavily classed
  // control would otherwise report nothing at all.
  it('fits a control whose own classes pass the limit, keeping its tag and the classes that fit', () => {
    const classes = Array.from({ length: 12 }, (_, i) => `utility-class-${i}`).join(' ')
    const root = mount(`<button class="${classes}">x</button>`)

    const selector = elementSelector(root.querySelector('button')!)

    expect(selector.length).toBeLessThanOrEqual(100)
    expect(selector).toMatch(/^button\.utility-class-0\./)
    expect(selector).not.toMatch(/\.$/)
  })

  it('never carries text or an attribute value', () => {
    const root = mount('<button class="fav" aria-label="Αγαπημένα: Mini power bank" data-product="5">Mini power bank</button>')

    expect(elementSelector(root.querySelector('button')!)).not.toMatch(/power|Αγαπημένα|5/)
  })
})

describe('createPressLog', () => {
  it('names the control a press landed in, not the label inside it', () => {
    const root = mount('<button class="fav"><span class="truncate">Αγαπημένα</span></button>')
    const log = createPressLog()

    log.record(press(root.querySelector('span')!, 1000))

    expect(log.targetAt(1000)).toBe('html>body>div>button.fav')
  })

  it('still names a control the interaction removed from the page', () => {
    const root = mount('<button class="fav">♡</button>')
    const log = createPressLog()
    const button = root.querySelector('button')!

    log.record(press(button, 1000))
    button.remove()

    expect(log.targetAt(1080)).toBe('html>body>div>button.fav')
  })

  it('answers with the last press before the interaction started', () => {
    const root = mount('<button class="one">1</button><button class="two">2</button>')
    const log = createPressLog()

    log.record(press(root.querySelector('.one')!, 1000))
    log.record(press(root.querySelector('.two')!, 3000))

    expect(log.targetAt(1100)).toBe('html>body>div>button.one')
    expect(log.targetAt(3050)).toBe('html>body>div>button.two')
  })

  it('names nothing for an interaction with no recent press', () => {
    const root = mount('<button class="one">1</button>')
    const log = createPressLog()

    log.record(press(root.querySelector('button')!, 1000))

    expect(log.targetAt(500)).toBeUndefined()
    expect(log.targetAt(9000)).toBeUndefined()
    expect(log.targetAt(undefined)).toBeUndefined()
  })

  it('keeps only the most recent presses', () => {
    const root = mount('<button class="one">1</button>')
    const log = createPressLog(2)
    const button = root.querySelector('button')!

    log.record(press(button, 100))
    log.record(press(button, 200))
    log.record(press(button, 300))

    expect(log.targetAt(150)).toBeUndefined()
    expect(log.targetAt(250)).toBe('html>body>div>button.one')
  })
})
