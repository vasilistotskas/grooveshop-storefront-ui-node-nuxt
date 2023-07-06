
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { spacing, fontFamily } = require('tailwindcss/defaultTheme')

const MyTheme = {
	colors: {
		gray: {
			DEFAULT: '#666666',
			100: '#fafafa',
			200: '#eaeaea',
			300: '#999999',
			400: '#888888',
			500: '#666666',
			600: '#444444',
			700: '#333333',
			800: '#222222',
			900: '#111111'
		},
		green: {
			DEFAULT: '#3BA676',
			50: '#B4E4CF',
			100: '#A5DFC5',
			200: '#87D4B2',
			300: '#69CA9E',
			400: '#4BBF8B',
			500: '#3BA676',
			600: '#2C7D59',
			700: '#1E533B',
			800: '#0F2A1E',
			900: '#000000'
		},
		blue: {
			DEFAULT: '#0096FF',
			50: '#B8E2FF',
			100: '#A3D9FF',
			200: '#7AC8FF',
			300: '#52B8FF',
			400: '#29A7FF',
			500: '#0096FF',
			600: '#0075C7',
			700: '#00548F',
			800: '#003357',
			900: '#00121F'
		},
		red: {
			DEFAULT: '#FF6464',
			50: '#FFFFFF',
			100: '#FFFFFF',
			200: '#FFDEDE',
			300: '#FFB6B6',
			400: '#FF8D8D',
			500: '#FF6464',
			600: '#FF2C2C',
			700: '#F30000',
			800: '#BB0000',
			900: '#830000'
		}
	}
}

module.exports = {
	content: [
		'./components/**/*.{vue,js}',
		'./composables/**/*.{js,ts}',
		'./content/**/*.md',
		'./layouts/**/*.vue',
		'./pages/**/*.vue',
		'./plugins/**/*.{js,ts}',
		'./utils/**/*.{js,ts}',
		'./config/**/*.{js,ts}',
		'./app.vue'
	],
	future: {
		hoverOnlyWhenSupported: true
	},
	attributify: false,
	darkMode: 'class',
	theme: {
		container: {
			center: true,
			padding: '1rem'
		},
		extend: {
			maxWidth: {
				'8xl': '90rem'
			},
			colors: {
				'blue-opaque': 'rgb(13 42 148 / 18%)',
				primary: MyTheme.colors.green,
				green: MyTheme.colors.green,
				blue: MyTheme.colors.blue,
				red: MyTheme.colors.red
			},
			fontFamily: {
				sans: ['Inter', ...fontFamily.sans]
			},
			typography: (theme) => ({
				DEFAULT: {
					css: {
						color: theme('colors.gray.700'),
						a: {
							color: theme('colors.blue.500'),
							'&:hover': {
								color: theme('colors.blue.700')
							},
							code: { color: theme('colors.blue.400') }
						},
						'h2,h3,h4': {
							'scroll-margin-top': spacing[32]
						},
						thead: {
							borderBottomColor: theme('colors.gray.200')
						},
						code: { color: theme('colors.pink.500') },
						'blockquote p:first-of-type::before': false,
						'blockquote p:last-of-type::after': false
					}
				},
				dark: {
					css: {
						color: theme('colors.gray.200'),
						a: {
							color: theme('colors.red.400'),
							'&:hover': {
								color: theme('colors.red.600')
							},
							code: { color: theme('colors.red.400') }
						},
						blockquote: {
							borderLeftColor: theme('colors.gray.700'),
							color: theme('colors.gray.300')
						},
						'h2,h3,h4': {
							color: theme('colors.gray.100'),
							'scroll-margin-top': spacing[32]
						},
						hr: { borderColor: theme('colors.gray.700') },
						ol: {
							li: {
								'&:before': { color: theme('colors.gray.500') }
							}
						},
						ul: {
							li: {
								'&:before': { backgroundColor: theme('colors.gray.500') }
							}
						},
						strong: { color: theme('colors.gray.100') },
						thead: {
							th: {
								color: theme('colors.gray.100')
							},
							borderBottomColor: theme('colors.gray.600')
						},
						tbody: {
							tr: {
								borderBottomColor: theme('colors.gray.700')
							}
						}
					}
				}
			}),
			gridTemplateColumns: {
				'auto-1fr': 'auto 1fr',
				'2fr-1fr': '2fr 1fr',
				'1fr-auto': '1fr auto',
				'auto-auto': 'auto auto',
				'repeat-auto-fill-mimax-80-auto': 'repeat(auto-fill, minmax(87px, auto));',
				'repeat-auto-fill-mimax-350-auto': 'repeat(auto-fill, minmax(350px, auto));'
			},
			gridTemplateRows: {
				'auto-1fr': 'auto 1fr',
				'auto-auto-1fr': 'auto auto 1fr',
				'repeat-auto-fill-mimax-100-130': 'repeat(auto-fill, minmax(100px, 130px))'
			},
			gridRow: {
				'second-row': '2'
			},
			gridColumn: {
				'full-column': '1 / span 2'
			}
		}
	},
	variants: {
		typography: ['dark']
	},
	shortcuts: {
		'light-img': 'block dark:hidden',
		'dark-img': 'hidden dark:block'
	},
	plugins: [require('@tailwindcss/typography')]
}
