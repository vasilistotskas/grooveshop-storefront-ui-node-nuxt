import type { ModuleOptions } from '@nuxtjs/tailwindcss'

export const tailwindcss = {
	cssPath: '~/assets/sass/tailwind.scss',
	configPath: './tailwind.config.ts',
	exposeConfig: {
		level: 2
	},
	config: {},
	injectPosition: 'first',
	viewer: true
} satisfies Partial<ModuleOptions>
