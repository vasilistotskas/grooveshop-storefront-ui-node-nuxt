export const image = {
	dir: 'public',
	staticFilename: '[publicPath]/assets/images/[name]-[hash][ext]',
	providers: {
		mediaStream: {
			name: 'mediaStream', // optional value to overrider provider name
			provider: '~/providers/media-stream', // Path to custom provider
			options: {
				background: 'transparent'
			}
		}
	},
	screens: {
		xs: 320,
		sm: 640,
		md: 768,
		lg: 1024,
		xl: 1280,
		xxl: 1536,
		'2xl': 1536
	}
}
