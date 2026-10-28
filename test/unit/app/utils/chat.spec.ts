import { describe, expect, it } from 'vitest'
import { chatSegments, retryWhen } from '~/utils/chat'

const list = (at: number, ids: number[] = [1]) => ({ tool: 'search_products', ids, at })

describe('chatSegments', () => {
  it('is just the text when nothing was surfaced', () => {
    expect(chatSegments('Γεια σου')).toEqual([{ type: 'text', text: 'Γεια σου' }])
  })

  it('keeps the words before a list and puts it after the paragraph it arrived in', () => {
    const event = list(8)

    expect(chatSegments('Ψάχνω.\n\nΒρήκα δύο.\n\nΤι άλλο;', [event])).toEqual([
      { type: 'text', text: 'Ψάχνω.\n\nΒρήκα δύο.' },
      { type: 'products', event },
      { type: 'text', text: '\n\nΤι άλλο;' },
    ])
  })

  it('puts a list that arrived before any text after the words that introduce it', () => {
    const event = list(0)

    expect(chatSegments('Βρήκα δύο.\n\nΤι άλλο;', [event])).toEqual([
      { type: 'text', text: 'Βρήκα δύο.' },
      { type: 'products', event },
      { type: 'text', text: '\n\nΤι άλλο;' },
    ])
  })

  it('puts a list that arrived before any text at the end while its words still stream', () => {
    const event = list(0)

    expect(chatSegments('Βρήκα', [event])).toEqual([
      { type: 'text', text: 'Βρήκα' },
      { type: 'products', event },
    ])
  })

  it('shows the cards alone when no text ever follows them', () => {
    const event = list(0)

    expect(chatSegments('', [event])).toEqual([{ type: 'products', event }])
  })

  it('keeps several lists in arrival order and drops blank runs between them', () => {
    const first = list(0, [1])
    const second = list(0, [2])

    expect(chatSegments('', [second, first])).toEqual([
      { type: 'products', event: second },
      { type: 'products', event: first },
    ])
  })

  it('clamps an offset past the end of the text', () => {
    const event = list(99)

    expect(chatSegments('ok', [event])).toEqual([
      { type: 'text', text: 'ok' },
      { type: 'products', event },
    ])
  })
})

describe('retryWhen', () => {
  it.each([
    [1, 'en', 'in 1 second'],
    [42, 'en', 'in 42 seconds'],
    [61, 'en', 'in 2 minutes'],
    [3599, 'en', 'in 60 minutes'],
    [3601, 'en', 'in 2 hours'],
    [300, 'el', 'σε 5 λεπτά'],
    [7200, 'el', 'σε 2 ώρες'],
  ])('says %i seconds as the %s page does', (seconds, locale, expected) => {
    expect(retryWhen(seconds, locale)).toBe(expected)
  })
})
