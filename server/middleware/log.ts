export default defineEventHandler(async (event) => {
  const start = performance.now()

  const { req, res } = event.node
  const url = req.url || ''

  // Add Server-Timing header for performance debugging
  res.on('finish', () => {
    const duration = Math.round(performance.now() - start)
    const statusCode = res.statusCode
    const method = req.method

    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    // Log with more detail for slow requests
    if (duration > 200) {
      console.warn(`[${timestamp}] ⚠️ SLOW ${method} ${url} ${statusCode} - ${duration}ms`)
    }
    else {
      console.log(`[${timestamp}] ${method} ${url} ${statusCode} - ${duration}ms`)
    }
  })

  // Set Server-Timing header for browser DevTools
  res.setHeader('Server-Timing', `total;dur=${0}`)
})
