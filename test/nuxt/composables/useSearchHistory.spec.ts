import { describe, it, expect, vi, beforeEach } from 'vitest'

/** The page renders `el` in the harness (vitest.config.mts pins it). */
const KEY = 'search:recent:el'
const stored = () => JSON.parse(window.localStorage.getItem(KEY) ?? 'null')

describe('useSearchHistory', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reads the stored history for the page\'s locale when created', () => {
    window.localStorage.setItem(KEY, JSON.stringify(['boots', 'shoes']))
    window.localStorage.setItem('search:recent:en', JSON.stringify(['english only']))

    expect(useSearchHistory().entries.value).toEqual(['boots', 'shoes'])
  })

  it('puts a new query first, trimmed, and persists it under the locale\'s key', () => {
    window.localStorage.setItem(KEY, JSON.stringify(['shoes']))
    const history = useSearchHistory()

    history.add('  boots  ')

    expect(history.entries.value).toEqual(['boots', 'shoes'])
    expect(stored()).toEqual(['boots', 'shoes'])
  })

  it('moves a repeated query to the front instead of listing it twice, whatever its case', () => {
    window.localStorage.setItem(KEY, JSON.stringify(['shoes', 'Boots', 'hats']))
    const history = useSearchHistory()

    history.add('boots')

    expect(history.entries.value).toEqual(['boots', 'shoes', 'hats'])
  })

  it('keeps only the eight most recent queries', () => {
    const history = useSearchHistory()

    for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9']) history.add(q)

    expect(history.entries.value).toEqual(['q9', 'q8', 'q7', 'q6', 'q5', 'q4', 'q3', 'q2'])
  })

  it.each([
    ['a single character', 'a'],
    ['whitespace padding one character', '  a  '],
    ['an empty string', ''],
  ])('ignores %s', (_case, query) => {
    const history = useSearchHistory()

    history.add(query)

    expect(history.entries.value).toEqual([])
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it.each([
    ['corrupt JSON', '{not json'],
    ['a non-array value', '{"q":"boots"}'],
  ])('treats %s in storage as an empty history', (_case, raw) => {
    window.localStorage.setItem(KEY, raw)

    expect(useSearchHistory().entries.value).toEqual([])
  })

  it('drops non-string entries from a hand-edited history', () => {
    window.localStorage.setItem(KEY, JSON.stringify(['boots', 42, null, 'shoes']))

    expect(useSearchHistory().entries.value).toEqual(['boots', 'shoes'])
  })

  it('empties the list and the stored copy on clear', () => {
    window.localStorage.setItem(KEY, JSON.stringify(['boots']))
    const history = useSearchHistory()

    history.clear()

    expect(history.entries.value).toEqual([])
    expect(stored()).toEqual([])
  })

  it('still updates the list when storage refuses the write', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const history = useSearchHistory()

    history.add('boots')

    expect(history.entries.value).toEqual(['boots'])
  })

  it('picks up history another tab wrote when refreshed', () => {
    const history = useSearchHistory()
    window.localStorage.setItem(KEY, JSON.stringify(['from another tab']))

    history.refresh()

    expect(history.entries.value).toEqual(['from another tab'])
  })
})
