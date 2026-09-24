/**
 * Seeds every request's runtime config from the copy Nitro resolved at boot.
 *
 * Nitro 2's `useRuntimeConfig(event)` builds a per-request config by deep
 * cloning the build-time config and re-applying every NUXT_/NITRO_ env
 * override to it: a snakeCase() and two process.env reads for each of ~800
 * keys (route rules and nuxt-auth-utils' provider stubs are most of them).
 * @nuxtjs/i18n, site-config, robots, ai-ready and our own routes call it on
 * EVERY request, internal $fetch subrequests included, so one page render
 * paid for it ~20 times. Profiled 2026-09-25: 63% of the CPU of a trivial
 * request and ~19% of a page render.
 *
 * process.env does not change after boot, so re-applying it yields exactly
 * the config Nitro already resolved. The request still gets its OWN copy
 * (the resolved one is deep-frozen, and request code may write to its
 * copy); only the env walk is dropped. Upstream: nitrojs/nitro#2569.
 *
 * Registered through `nitro.plugins` in nuxt.config, NOT server/plugins/:
 * scanned plugins run after module plugins, whose `request` hooks would
 * already have built the expensive copy by the time this one ran.
 */
export default defineNitroPlugin((nitroApp) => {
  const resolved = useRuntimeConfig()

  nitroApp.hooks.hook('request', (event) => {
    event.context.nitro.runtimeConfig ??= structuredClone(resolved)
  })
})
