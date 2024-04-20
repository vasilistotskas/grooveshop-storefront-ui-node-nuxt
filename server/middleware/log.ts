export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)

  if (import.meta.env.NODE_ENV !== 'production') {
    console.info(`New request: ${requestUrl}`)
  }
})
