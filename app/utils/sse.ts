export interface SSEEvent {
  event: string
  data: string
}

/**
 * Incremental Server-Sent-Events parser.
 *
 * Network chunks do not align with event boundaries, so the parser
 * buffers input and emits a complete event every time it sees the
 * blank-line terminator. Pure function of its input — the streaming
 * fetch reader in `useShopChat` feeds it decoded chunks.
 */
export function createSSEParser(onEvent: (event: SSEEvent) => void) {
  let buffer = ''

  const processBlock = (block: string) => {
    let eventName = 'message'
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      }
      else if (line.startsWith('data:')) {
        // Per spec a single leading space after the colon is stripped;
        // the rest of the line is data verbatim.
        dataLines.push(line.slice(5).replace(/^ /, ''))
      }
      // Comments (`:` prefix) and unknown fields are ignored.
    }
    if (dataLines.length > 0) {
      onEvent({ event: eventName, data: dataLines.join('\n') })
    }
  }

  return {
    feed(chunk: string) {
      buffer += chunk.replace(/\r\n/g, '\n')
      let separatorIndex = buffer.indexOf('\n\n')
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex)
        buffer = buffer.slice(separatorIndex + 2)
        if (block.trim()) {
          processBlock(block)
        }
        separatorIndex = buffer.indexOf('\n\n')
      }
    },
  }
}
