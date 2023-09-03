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
	server: {
		hmr: {
			protocol: process.env.NODE_ENV === 'production' ? 'wss' : 'ws',
			clientPort: 24678,
			path: 'hmr/'
		},
		watch: {
			usePolling: process.env.NODE_ENV !== 'production'
		}
	}
}
