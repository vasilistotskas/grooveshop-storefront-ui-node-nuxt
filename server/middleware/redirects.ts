export default defineEventHandler((event) => {
  const host = getRequestHost(event)

  if (host.startsWith('www.')) {
    const nonWwwHost = host.slice(4)
    const protocol = event.node.req.headers['x-forwarded-proto'] || 'https'
    const newUrl = `${protocol}://${nonWwwHost}${event.node.req.url}`
    return sendRedirect(event, newUrl, 301)
  }
})
