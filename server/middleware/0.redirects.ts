export default defineEventHandler((event) => {
  const host = getRequestHost(event)
  if (host.startsWith('www.')) {
    return sendRedirect(event, `https://${host.slice(4)}${event.path}`, 301)
  }
})
