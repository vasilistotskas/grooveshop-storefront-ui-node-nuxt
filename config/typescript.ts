export const typescript = {
	strict: true,
	typeCheck: true,
	tsConfig: {
		compilerOptions: {
			moduleResolution: 'bundler',
			types: ['unplugin-icons/types/vue'],
			skipLibCheck: true
		},
		exclude: ['node_modules']
	}
}
