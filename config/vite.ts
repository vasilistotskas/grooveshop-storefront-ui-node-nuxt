import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'

export const vite = {
	plugins: [
		Components({
			deep: true,
			dts: 'components.d.ts',
			directoryAsNamespace: true,
			resolvers: [
				IconsResolver({
					prefix: 'Icon',
					enabledCollections: [
						'bi',
						'clarity',
						'entypo',
						'fa6-solid',
						'fa-solid',
						'ic',
						'la',
						'mdi',
						'uil',
						'fluent'
					]
				})
			]
		}),
		Icons({
			compiler: 'vue3'
		}),
		AutoImport({
			imports: ['vitest'],
			dts: true // generate TypeScript declaration
		})
	],
	build: {
		rollupOptions: {
			output: {
				manualChunks(id: string) {
					const chunks = ['sweetalert2', 'vuepic', 'zod']
					if (id.includes('/node_modules/')) {
						for (const chunkName of chunks) {
							if (id.includes(chunkName)) {
								return chunkName
							}
						}
					}
				}
			}
		}
	}
}
