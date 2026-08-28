import { provideSSRWidth } from '@vueuse/core'

export default defineNuxtPlugin({
  name: 'ssr-width',
  setup(nuxtApp) {
    const headers = useRequestHeaders(['user-agent'])
    const ua = headers['user-agent'] || ''

    // Classifier is shared with server/middleware/1.device-class.ts —
    // the cached-SSR cache keys vary on the same classification this
    // width feeds into the markup. Never fork the regexes.
    const deviceClass = deviceClassFromUserAgent(ua)
    provideSSRWidth(SSR_WIDTH_BY_DEVICE_CLASS[deviceClass], nuxtApp.vueApp)
  },
})
