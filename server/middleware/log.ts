export default defineEventHandler(async (event) => {
  const start = performance.now()

  const { req, res } = event.node
  res.on('finish', () => {
    const duration = Math.round(performance.now() - start)
    const statusCode = res.statusCode
    const method = req.method
    const url = req.url

    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    console.log(`[${timestamp}] ${method} ${url} ${statusCode} - ${duration}ms`)
  })
})
