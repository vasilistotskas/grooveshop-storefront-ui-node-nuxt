export const linkChecker = {
  report: {
    html: true,
    markdown: true,
  },
  debug: import.meta.env.NODE_ENV !== 'production',
  enabled: import.meta.env.NODE_ENV !== 'production',
  excludeLinks: [
    import.meta.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
    import.meta.env.NUXT_PUBLIC_SOCIALS_TWITTER,
    import.meta.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
    import.meta.env.NUXT_PUBLIC_SOCIALS_DISCORD,
    import.meta.env.NUXT_PUBLIC_SOCIALS_TIKTOK,
    import.meta.env.NUXT_PUBLIC_SOCIALS_YOUTUBE,
    import.meta.env.NUXT_PUBLIC_SOCIALS_REDDIT,
    import.meta.env.NUXT_PUBLIC_SOCIALS_PINTEREST,
  ],
}
