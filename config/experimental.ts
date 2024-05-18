export const experimental = {
  typedPages: true,
  renderJsonPayloads: true,
  asyncContext: true,
  cookieStore: true,
  watcher: (process.env.NUXT_PUBLIC_EXPERIMENTAL_WATCHER || 'parcel') as
  | 'chokidar'
  | 'chokidar-granular'
  | 'parcel'
  | undefined,
}
