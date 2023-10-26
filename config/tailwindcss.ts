import type { ModuleOptions } from '@nuxtjs/tailwindcss'

export const tailwindcss = {
	cssPath: '~/assets/sass/tailwind.scss',
	configPath: './tailwind.config.ts',
	exposeConfig: false,
	exposeLevel: 2,
	config: {},
	injectPosition: 'first',
	viewer: true
} satisfies Partial<ModuleOptions>
