export const linkChecker = {
  report: {
    html: true,
    markdown: true,
  },
  debug: process.env.NODE_ENV !== 'production',
  enabled: process.env.NODE_ENV !== 'production',
  excludeLinks: [
    process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
    process.env.NUXT_PUBLIC_SOCIALS_TWITTER,
    process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
    process.env.NUXT_PUBLIC_SOCIALS_DISCORD,
    process.env.NUXT_PUBLIC_SOCIALS_TIKTOK,
    process.env.NUXT_PUBLIC_SOCIALS_YOUTUBE,
    process.env.NUXT_PUBLIC_SOCIALS_REDDIT,
    process.env.NUXT_PUBLIC_SOCIALS_PINTEREST,
  ],
}
