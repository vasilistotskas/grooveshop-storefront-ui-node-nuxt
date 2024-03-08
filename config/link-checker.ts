export const linkChecker = {
  report: {
    html: true,
    markdown: true,
  },
  debug: process.env.NODE_ENV !== 'production',
  enabled: true,
  excludeLinks: [
    process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
    process.env.NUXT_PUBLIC_SOCIALS_TWITTER,
    process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
    process.env.NUXT_PUBLIC_SOCIALS_DISCORD,
  ],
}
