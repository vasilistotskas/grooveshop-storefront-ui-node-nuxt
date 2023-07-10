module.exports = {
	apps: [
		{
			name: '@vasilistotskas/grooveshop-storefront-ui-node-nuxt',
			port: '3000',
			exec_mode: 'cluster',
			instances: 'max',
			script: './.output/server/index.mjs'
		}
	]
}
