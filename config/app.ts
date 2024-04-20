export const app = {
  keepalive: true,
  head: {
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    charset: 'utf-8',
    templateParams: {
      separator: '-',
    },
    link: [
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      { rel: 'apple-touch-icon', href: '/favicon/apple-touch-icon.png' },
    ],
  },
}
