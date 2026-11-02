import { describe, expect, it } from 'vitest'
import { REMOVE_LINK, mapLinkSettings } from '~~/shared/builder/linkSettings'

describe('mapLinkSettings', () => {
  const upper = (link: unknown) => (typeof link === 'string' ? link.toUpperCase() : link)

  it('maps a link at the top level and at depth', () => {
    expect(mapLinkSettings({ a: 'x', n: { b: 'y' }, c: 'z' }, ['/a', '/n/b'], upper)).toEqual({ a: 'X', n: { b: 'Y' }, c: 'z' })
  })

  it('maps every entry of a list, and tells map the concrete pointer', () => {
    const seen: string[] = []

    const result = mapLinkSettings({ slides: [{ to: 'a' }, { to: 'b' }] }, ['/slides/*/to'], (link, pointer) => {
      seen.push(pointer)
      return upper(link)
    })

    expect(result).toEqual({ slides: [{ to: 'A' }, { to: 'B' }] })
    expect(seen).toEqual(['/slides/0/to', '/slides/1/to'])
  })

  it('takes out a link map answers REMOVE_LINK for, and only that one', () => {
    const result = mapLinkSettings({ a: 'gone', b: 'kept', n: { c: 'gone' } }, ['/a', '/b', '/n/c'], link => (link === 'gone' ? REMOVE_LINK : link))

    expect(result).toEqual({ b: 'kept', n: {} })
  })

  it('drops a list entry whose link is removed from a list of links', () => {
    expect(mapLinkSettings({ links: ['a', 'gone', 'b'] }, ['/links/*'], link => (link === 'gone' ? REMOVE_LINK : link))).toEqual({ links: ['a', 'b'] })
  })

  it('does not visit a setting the node does not have', () => {
    const visited: string[] = []

    const settings = { other: 1 }
    const result = mapLinkSettings(settings, ['/a', '/n/b', '/l/*/to'], (link, pointer) => {
      visited.push(pointer)
      return link
    })

    expect(visited).toEqual([])
    expect(result).toBe(settings)
  })

  it('does not mutate its input and keeps the identity of what it does not change', () => {
    const settings = { a: 'x', n: { b: 'y' }, keep: { deep: 1 } }

    const result = mapLinkSettings(settings, ['/a'], upper)

    expect(settings).toEqual({ a: 'x', n: { b: 'y' }, keep: { deep: 1 } })
    expect(result.keep).toBe(settings.keep)
    expect(result.n).toBe(settings.n)
  })
})
