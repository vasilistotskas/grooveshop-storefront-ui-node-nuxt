import { describe, expect, it } from 'vitest'
import { analyzeMessage, sameShape } from '~~/shared/utils/messageShape'

describe('analyzeMessage', () => {
  it('reads named, list and linked parameters of a message', () => {
    const { errors, shape } = analyzeMessage('Hello {name}, {0} @:brand.name and @.upper:brand.title')

    expect(errors).toEqual([])
    expect(shape).toEqual({
      params: ['linked:brand.name', 'linked:brand.title|upper', 'list:0', 'named:name'],
      pluralCases: 1,
    })
  })

  it('counts the cases of a plural message and the parameters of all of them', () => {
    const { shape } = analyzeMessage('no items | {n} item | {count} items')

    expect(shape).toEqual({ params: ['named:count', 'named:n'], pluralCases: 3 })
  })

  it('counts a linked reference to a parameter as that parameter', () => {
    expect(analyzeMessage('a @:{key} b @:{0}').shape.params).toEqual(['list:0', 'named:key'])
  })

  it('treats a literal and plain HTML as no parameter, as the run-time compiler does', () => {
    const { errors, shape } = analyzeMessage('<b>{\'{braces}\'}</b> info{\'@\'}shop.gr')

    expect(errors).toEqual([])
    expect(shape.params).toEqual([])
  })

  it.each([
    ['an empty placeholder', '{}'],
    ['an unterminated placeholder', 'Hello {name'],
    ['an unbalanced closing brace', 'Hello } there'],
    ['an empty linked key', 'see @:'],
    ['a plural case without text', 'one |'],
  ])('reports %s as a compile error', (_label, source) => {
    expect(analyzeMessage(source).errors).not.toEqual([])
  })
})

describe('sameShape', () => {
  const base = { params: ['named:a', 'named:b'], pluralCases: 2 }

  it('is true for the same parameters and the same number of cases', () => {
    expect(sameShape(base, { params: ['named:a', 'named:b'], pluralCases: 2 })).toBe(true)
  })

  it.each([
    ['a missing parameter', { params: ['named:a'], pluralCases: 2 }],
    ['an extra parameter', { params: ['named:a', 'named:b', 'named:c'], pluralCases: 2 }],
    ['a renamed parameter', { params: ['named:a', 'named:c'], pluralCases: 2 }],
    ['another number of cases', { params: ['named:a', 'named:b'], pluralCases: 1 }],
  ])('is false for %s', (_label, other) => {
    expect(sameShape(base, other)).toBe(false)
  })
})
