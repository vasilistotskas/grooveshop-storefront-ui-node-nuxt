export const typescript = {
	strict: true,
	typeCheck: true,
	tsConfig: {
		compilerOptions: {
			types: ['unplugin-icons/types/vue'],
			skipLibCheck: true
		},
		exclude: ['node_modules']
	}
}
