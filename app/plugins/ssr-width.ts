import { provideSSRWidth } from '@vueuse/core'

/**
 * Seeds @vueuse's SSR viewport width — on BOTH sides, on purpose.
 *
 * `useMediaQuery` has no viewport to measure during SSR, so without a
 * width every `useDevice()` branch renders desktop. That half was
 * already solved here. The other half was not, and it is the half that
 * breaks pages: with no width provided on the CLIENT, `useMediaQuery`
 * reads `matchMedia` on its very first evaluation, which happens
 * DURING hydration. A phone-sized viewport then disagrees with the
 * markup the server sent and Vue patches two different trees into one.
 *
 * Measured on staging 2026-09-21: every one of the 26 public routes
 * logged "Hydration completed but contains mismatches" at 768px, and
 * `/blog` showed what that costs — each post card's overlay `<h2>`
 * ended up inside the DESKTOP card, which has no positioned wrapper,
 * so all four titles resolved against the page container and stacked
 * invisibly at `0,992` in near-white on white. A blog index of
 * captionless photographs. The same tree, the same escape, on
 * webside's live blog.
 *
 * With a width provided here, VueUse's `ssrSupport` branch answers the
 * first evaluation from that width — identical to the server — and only
 * swaps to the real `matchMedia` on the next flush, which is an
 * ordinary reactive update that mounts and unmounts components
 * properly. Mismatch becomes an update.
 *
 * The client does NOT re-derive the class from `navigator.userAgent`:
 * it reads back the number the server actually used, through the
 * payload. Re-deriving would be a second implementation of the same
 * decision, free to drift — and it would be wrong for any prerendered
 * route, where the server had no user-agent at all and the client
 * would confidently disagree with the HTML in front of it.
 */
export default defineNuxtPlugin({
  name: 'ssr-width',
  setup(nuxtApp) {
    const ssrWidth = useState<number>('ssr-width', () => {
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
      return SSR_WIDTH_BY_DEVICE_CLASS[deviceClass]
    })

    provideSSRWidth(ssrWidth.value, nuxtApp.vueApp)
  },
})
