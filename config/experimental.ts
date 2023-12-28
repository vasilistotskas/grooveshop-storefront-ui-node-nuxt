export const experimental = {
	inlineSSRStyles: true,
	componentIslands: {
		selectiveClient: true
	},
	viewTransition: true,
	renderJsonPayloads: true,
	typedPages: true,
	headNext: true,
	asyncContext: true,
	payloadExtraction: true,
	typescriptBundlerResolution: true,
	watcher: (process.env.NUXT_PUBLIC_EXPERIMENTAL_WATCHER || 'parcel') as
		| 'chokidar'
		| 'chokidar-granular'
		| 'parcel'
		| undefined
}
