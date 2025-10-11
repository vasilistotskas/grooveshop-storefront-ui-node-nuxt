export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  if (import.meta.dev) {
    console.info(`[${timestamp}] New request: ${requestUrl}`)
  }
})
