import { describe, expect, it } from 'vitest'
import { chatSegments } from '~/utils/chat'

const list = (at: number, ids: number[] = [1]) => ({ tool: 'search_products', ids, at })

describe('chatSegments', () => {
  it('is just the text when nothing was surfaced', () => {
    expect(chatSegments('Γεια σου')).toEqual([{ type: 'text', text: 'Γεια σου' }])
  })

  it('puts a list where it arrived, between the words before and after it', () => {
    const event = list(5)

    expect(chatSegments('Ψάχνω.\n\nΒρήκα δύο.', [event])).toEqual([
      { type: 'text', text: 'Ψάχνω' },
      { type: 'products', event },
      { type: 'text', text: '.\n\nΒρήκα δύο.' },
    ])
  })

  it('leads with the cards when they arrived before any text', () => {
    const event = list(0)

    expect(chatSegments('Βρήκα δύο.', [event])).toEqual([
      { type: 'products', event },
      { type: 'text', text: 'Βρήκα δύο.' },
    ])
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
