export default defineEventHandler((event) => {
  const host = getRequestHost(event)
  // Redirect www to non-www
  if (host.startsWith('www.')) {
    return sendRedirect(event, `https://${host.slice(4)}${event.path}`, 301)
  }
})
