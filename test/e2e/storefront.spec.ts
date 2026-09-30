import { describe } from 'vitest'
import { setupDevServer, startFakeDjango } from '../helpers/e2e'
import { describePageRenders, pageRenderUpstream } from './pageRenders'
import { PLATFORM_FALLBACK_HOST, describeSwrHostPropagation, swrProbeUpstream } from './swrHostPropagation'

/**
 * The ONE dev server the e2e suites share.
 *
 * Booting it is most of the cost of this project (about 110s on a
 * developer machine, measured 2026-09-30), and two can never run at
 * once: every file runs in parallel, and @nuxt/cli refuses a second dev
 * server on the same root ("Another Nuxt dev server is already
 * running"), which failed whichever file booted second. So the suites
 * are modules registered here, against one fake Django that dispatches
 * each request to the suite that owns it. The cost: a boot failure
 * fails every suite at once — as it did before, since they booted the
 * same app.
 */
describe('storefront on a real dev server', async () => {
  const fakeDjango = await startFakeDjango((req, res, url) => {
    if (swrProbeUpstream(req, res, url)) return
    pageRenderUpstream(req, res, url)
  })

  await setupDevServer(fakeDjango, {
    NUXT_PUBLIC_DJANGO_HOST_NAME: PLATFORM_FALLBACK_HOST,
  })

  describePageRenders()
  describeSwrHostPropagation()
})
