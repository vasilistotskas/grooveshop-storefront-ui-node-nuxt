export default defineAppConfig({
  ui: {
    primary: 'zinc',
    gray: 'cool',
    button: {
      color: {
        primary: {
          solid: 'bg-primary-100 dark:bg-primary-900',
        },
        opposite: {
          solid: 'bg-primary-900 dark:bg-primary-100',
        },
        secondary: {
          solid:
            'bg-secondary dark:bg-secondary text-primary-100 dark:text-primary-100',
        },
      },
    },
  },
  nuxtIcon: {},
})
