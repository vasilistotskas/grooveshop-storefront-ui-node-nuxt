import type { ConfiguredImageProviders, ImageOptions, ResolvedImage } from '@nuxt/image'

// @nuxt/image v2.0.0 regressed the `useImage()` / `$img` call signature: its
// `options.provider` is typed as the single default provider (`'ipx'`) instead
// of `keyof ConfiguredImageProviders`, so passing a configured custom provider
// (e.g. `mediaStream`) no longer typechecks. See nuxt/image#2036 (fix in PR
// #2141). Merge in the generic call signature upstream intends — overload
// resolution falls through to it whenever a non-default `provider` is supplied,
// and standard calls still match the original signature.
// Remove once a fixed @nuxt/image release lands.
declare module '@nuxt/image' {
  interface Img {
    <Provider extends keyof ConfiguredImageProviders>(
      source: string,
      modifiers?: ImageOptions<Provider>['modifiers'],
      options?: ImageOptions<Provider>,
    ): ResolvedImage['url']
  }
}

export {}
