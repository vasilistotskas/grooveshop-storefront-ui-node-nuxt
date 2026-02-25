const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''

  if (url.startsWith('/_nuxt') || url.startsWith('/_ipx') || url.startsWith('/assets') || url.startsWith('/favicon')) return

  const start = performance.now()
  const { req, res } = event.node

  res.on('finish', () => {
    const duration = Math.round(performance.now() - start)
    const statusCode = res.statusCode
    const method = req.method
    const timestamp = timestampFormatter.format(new Date())

    if (duration > 200) {
      console.warn(`[${timestamp}] SLOW ${method} ${url} ${statusCode} - ${duration}ms`)
    }
    else {
      if (import.meta.dev) console.log(`[${timestamp}] ${method} ${url} ${statusCode} - ${duration}ms`)
    }
  })
})
