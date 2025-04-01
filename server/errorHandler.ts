export default defineNitroErrorHandler(() => {
  // const statusCode = (error as any).statusCode || 500
  // event.node.res.statusCode = statusCode
  //
  // console.error('[Error Handler]', error)
  // console.error('event.node.res', event.node.res)
  //
  // const acceptHeader = 'accept' in event.node.req.headers ? event.node.req.headers.accept : ''
  // const userMessage
  //   = process.env.NODE_ENV === 'production' && statusCode === 500
  //     ? 'An unexpected error occurred. Please try again later.'
  //     : error.message
  //
  // if (acceptHeader?.includes('application/json')) {
  //   setResponseHeader(event, 'Content-Type', 'application/json')
  //   const responseBody = {
  //     error: {
  //       code: statusCode,
  //       message: userMessage,
  //     },
  //   }
  //   return send(event, JSON.stringify(responseBody))
  // }
  // else {
  //   setResponseHeader(event, 'Content-Type', 'text/html')
  //   const responseHtml = `
  //     <!DOCTYPE html>
  //     <html lang="en">
  //     <head>
  //       <meta charset="UTF-8">
  //       <title>${statusCode} Error</title>
  //     </head>
  //     <body>
  //       <h1>Error ${statusCode}</h1>
  //       <p>${userMessage}</p>
  //     </body>
  //     </html>
  //   `
  //   return send(event, responseHtml)
  // }
})
