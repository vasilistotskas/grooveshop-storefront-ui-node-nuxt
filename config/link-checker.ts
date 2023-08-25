export const linkChecker = {
	host: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
	failOn404: true,
	fetchRemoteUrls: false
}
