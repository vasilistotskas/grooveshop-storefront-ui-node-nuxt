import { provideSSRWidth } from '@vueuse/core'

export default defineNuxtPlugin({
  name: 'ssr-width',
  setup(nuxtApp) {
    const headers = useRequestHeaders(['user-agent'])
    const ua = headers['user-agent'] || ''

    let ssrWidth = 1280
    if (/Mobi/i.test(ua)) ssrWidth = 375
    else if (/iPad|Tablet|Android/i.test(ua)) ssrWidth = 810

    provideSSRWidth(ssrWidth, nuxtApp.vueApp)
  },
})
