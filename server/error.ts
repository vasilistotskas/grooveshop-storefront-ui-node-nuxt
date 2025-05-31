const logger = new Logger()

export default defineNitroErrorHandler(async (error, event) => {
  const session = await getSession(event, {
    name: 'nuxt-session',
    password: process.env.NUXT_SESSION_PASSWORD || 'your-secure-password-here',
  })
  const sessionId = session.data.sessionId
  const cartId = getHeader(event, 'X-Cart-Id')
  const sessionKey = getHeader(event, 'X-Session-Key')
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    statusCode: error.statusCode,
    url: event.node.req.url,
    method: event.node.req.method,
    userAgent: getHeader(event, 'user-agent'),
    stack: error.stack,
    sessionId,
    cartId,
    sessionKey,
  }

  await logger.logError(logEntry)

  setResponseStatus(event, error.statusCode || 500)

  const isApiRoute = event.node.req.url?.startsWith('/api/')

  if (isApiRoute) {
    setResponseHeader(event, 'Content-Type', 'application/json')
    return send(event, JSON.stringify({
      error: {
        statusCode: error.statusCode || 500,
        statusMessage: error.statusMessage || 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
      },
    }))
  }
  else {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error ${error.statusCode || 500}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; text-align: center; }
            .error-code { color: #e74c3c; font-size: 3rem; font-weight: bold; margin: 0; }
            .error-message { color: #7f8c8d; margin: 1rem 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error-code">${error.statusCode || 500}</h1>
            <p class="error-message">${error.statusMessage || 'Something went wrong'}</p>
            <p class="error-message">We've been notified and are looking into it.</p>
          </div>
        </body>
      </html>
    `

    setResponseHeader(event, 'Content-Type', 'text/html')
    return send(event, errorHtml)
  }
})
