export const experimental = {
  typedPages: true,
  renderJsonPayloads: true,
  asyncContext: true,
  cookieStore: true,
  watcher: (import.meta.env.NUXT_PUBLIC_EXPERIMENTAL_WATCHER || 'parcel') as
  | 'chokidar'
  | 'chokidar-granular'
  | 'parcel'
  | undefined,
}
