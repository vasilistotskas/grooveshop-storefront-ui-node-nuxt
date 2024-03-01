export const experimental = {
	inlineSSRStyles: true,
	typedPages: true,
	viewTransition: true,
	headNext: true,
	typescriptBundlerResolution: true,
	renderJsonPayloads: true,
	asyncContext: true,
	payloadExtraction: true,
	cookieStore: true,
	restoreState: true,
	watcher: (process.env.NUXT_PUBLIC_EXPERIMENTAL_WATCHER || 'parcel') as
		| 'chokidar'
		| 'chokidar-granular'
		| 'parcel'
		| undefined
}
