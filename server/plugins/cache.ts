export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (res) => {
    if (res && res.headers) {
      res.headers['cache-control'] = `max-age=${60 * 60 * 24 * 30}`
    }
  })
})
