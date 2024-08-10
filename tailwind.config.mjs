/** @type {import('tailwindcss/tailwind-config').TailwindConfig} */
export default {
  content: [
    './components/**/*.{vue,js}',
    './composables/**/*.{js,ts}',
    './content/**/*.md',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './utils/**/*.{js,ts}',
    './config/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  attributify: false,
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      maxWidth: {
        '8xl': '90rem',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      gridTemplateColumns: {
        'auto-1fr': 'auto 1fr',
        '2fr-1fr': '2fr 1fr',
        '1fr-auto': '1fr auto',
        'auto-auto': 'auto auto',
        'repeat-auto-fill-mimax-80-auto':
          'repeat(auto-fill, minmax(87px, auto));',
        'repeat-auto-fill-mimax-200-auto':
          'repeat(auto-fill, minmax(200px, auto));',
        'repeat-auto-fill-mimax-350-auto':
          'repeat(auto-fill, minmax(350px, auto));',
      },
      gridTemplateRows: {
        'auto-1fr': 'auto 1fr',
        'auto-auto-1fr': 'auto auto 1fr',
        'repeat-auto-fill-mimax-100-130':
          'repeat(auto-fill, minmax(100px, 130px))',
      },
      gridRow: {
        'second-row': '2',
      },
      gridColumn: {
        'full-column': '1 / span 2',
      },
      gridAutoColumns: {
        2: '50%',
        3: '33.333333%',
        4: '25%',
        5: '20%',
        6: '16.666667%',
      },
      colors: {
        secondary: {
          light: '#003DFF',
          DEFAULT: '#003DFF',
          dark: '#3364FF',
        },
      },
    },
  },
  variants: {
    typography: ['dark'],
  },
  shortcuts: {
    'light-img': 'block dark:hidden',
    'dark-img': 'hidden dark:block',
  },
}
