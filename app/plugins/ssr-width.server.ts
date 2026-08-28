import { provideSSRWidth } from '@vueuse/core'

export default defineNuxtPlugin({
  name: 'ssr-width',
  setup(nuxtApp) {
    // Prefer the x-device-class header stamped by
    // server/middleware/1.device-class.ts over classifying the UA here:
    // Nitro's cached handler (swr route rules) renders against a CLONED
    // event that carries ONLY the ``cache.varies`` headers — user-agent
    // never reaches this plugin on a cached render, so reading it
    // directly rendered every cached entry as desktop (found live
    // 2026-08-28: mobile visitors got the desktop hero + hydration
    // mismatches). x-device-class IS varied, so it survives the clone;
    // the UA fallback covers contexts without the middleware (tests).
    const headers = useRequestHeaders(['x-device-class', 'user-agent'])
    const headerClass = headers['x-device-class']
    const deviceClass: DeviceClass
      = headerClass && headerClass in SSR_WIDTH_BY_DEVICE_CLASS
        ? headerClass as DeviceClass
        : deviceClassFromUserAgent(headers['user-agent'] || '')
    provideSSRWidth(SSR_WIDTH_BY_DEVICE_CLASS[deviceClass], nuxtApp.vueApp)
  },
})
