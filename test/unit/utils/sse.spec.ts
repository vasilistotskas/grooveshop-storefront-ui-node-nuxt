import { describe, expect, it, vi } from 'vitest'
import { createSSEParser, type SSEEvent } from '~/utils/sse'

const collect = () => {
  const events: SSEEvent[] = []
  const parser = createSSEParser(e => events.push(e))
  return { events, parser }
}

describe('createSSEParser', () => {
  it('parses a complete event block', () => {
    const { events, parser } = collect()
    parser.feed('event: delta\ndata: {"text":"hi"}\n\n')

    expect(events).toEqual([{ event: 'delta', data: '{"text":"hi"}' }])
  })

  it('buffers events split across network chunks', () => {
    const { events, parser } = collect()
    parser.feed('event: del')
    parser.feed('ta\ndata: {"te')
    expect(events).toHaveLength(0)

    parser.feed('xt":"hi"}\n\n')
    expect(events).toEqual([{ event: 'delta', data: '{"text":"hi"}' }])
  })

  it('emits multiple events from a single chunk in order', () => {
    const { events, parser } = collect()
    parser.feed(
      'event: delta\ndata: {"text":"a"}\n\n'
      + 'event: done\ndata: {"conversationId":"c1"}\n\n',
    )

    expect(events.map(e => e.event)).toEqual(['delta', 'done'])
    expect(events[1]!.data).toBe('{"conversationId":"c1"}')
  })

  it('normalizes CRLF line endings', () => {
    const { events, parser } = collect()
    parser.feed('event: delta\r\ndata: {"text":"hi"}\r\n\r\n')

    expect(events).toEqual([{ event: 'delta', data: '{"text":"hi"}' }])
  })

  it('defaults the event name to "message" when absent', () => {
    const { events, parser } = collect()
    parser.feed('data: plain\n\n')

    expect(events).toEqual([{ event: 'message', data: 'plain' }])
  })

  it('ignores comment-only blocks and blocks without data', () => {
    const { events, parser } = collect()
    parser.feed(': keep-alive\n\n')
    parser.feed('event: ping\n\n')

    expect(events).toHaveLength(0)
  })

  it('joins multi-line data with newlines', () => {
    const { events, parser } = collect()
    parser.feed('event: delta\ndata: line1\ndata: line2\n\n')

    expect(events).toEqual([{ event: 'delta', data: 'line1\nline2' }])
  })

  it('strips only a single leading space after the data colon', () => {
    const { events, parser } = collect()
    parser.feed('data:  two spaces\n\n')

    expect(events).toEqual([{ event: 'message', data: ' two spaces' }])
  })

  it('does not emit for trailing incomplete input', () => {
    const onEvent = vi.fn()
    const parser = createSSEParser(onEvent)
    parser.feed('event: delta\ndata: {"text":"hi"}\n')

    expect(onEvent).not.toHaveBeenCalled()
  })
})
