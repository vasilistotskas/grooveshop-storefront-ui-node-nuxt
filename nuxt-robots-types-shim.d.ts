import type { RobotsValue } from '@nuxtjs/robots'

// @nuxtjs/robots gates its dual-path augmentation behind a strict
// `Number(future.compatibilityVersion) === 4` check (see PR #295, v6.0.8).
// With `compatibilityVersion: 5` set in nuxt.config.ts we fall through to
// the `["nitropack"]`-only branch, but @nuxt/kit types `defineRouteRules`
// argument as `NitroRouteConfig` resolved from `nitropack/types`. Augment
// the modern path here so per-page `robots: false` typechecks under cv=5.
// Remove when the upstream check becomes `>= 4` or cv is reverted to 4.
declare module 'nitropack/types' {
  interface NitroRouteConfig {
    robots?: RobotsValue | { indexable: boolean, rule: string }
  }
  interface NitroRouteRules {
    robots?: RobotsValue | { indexable: boolean, rule: string }
  }
}

export {}
