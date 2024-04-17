export default defineAppConfig({
  ui: {
    primary: 'zinc',
    gray: 'zinc',
    button: {
      color: {
        primary: {
          solid:
            'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100',
          soft: 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200',
        },
        opposite: {
          solid:
            'bg-primary-900 dark:bg-primary-100 text-primary-100 dark:text-primary-900',
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
