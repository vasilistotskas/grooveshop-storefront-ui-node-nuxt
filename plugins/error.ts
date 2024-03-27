export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (..._args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('vue:error', ..._args)
    }
  })
  nuxtApp.hook('app:error', (..._args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('app:error', ..._args)
    }
  })
  nuxtApp.vueApp.config.errorHandler = (..._args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('global error handler', ..._args)
    }
  }
})
