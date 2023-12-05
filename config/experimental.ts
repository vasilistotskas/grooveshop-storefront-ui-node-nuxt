export const experimental = {
	inlineSSRStyles: false,
	componentIslands: true,
	viewTransition: true,
	renderJsonPayloads: true,
	typedPages: true,
	headNext: true,
	asyncContext: true,
	payloadExtraction: true,
	watcher: (process.env.NUXT_PUBLIC_EXPERIMENTAL_WATCHER || 'parcel') as
		| 'chokidar'
		| 'chokidar-granular'
		| 'parcel'
		| undefined
}
