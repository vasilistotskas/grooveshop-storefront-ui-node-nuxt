<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'

const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const { locale, locales } = useI18n()
const colorMode = useColorMode()

const cartStore = useCartStore()
const { fetchCart } = cartStore
await fetchCart()

const themeClass = computed(() => (colorMode.value === 'dark' ? 'dark' : 'light'))
const themeColor = computed(() => (colorMode.value === 'dark' ? '#1a202c' : '#ffffff'))

const i18nHead = useLocaleHead({
	addDirAttribute: true,
	addSeoAttributes: true,
	identifierAttribute: 'hid',
	route,
	router,
	i18n: useI18n()
})

const headOptions = {
	htmlAttrs: {
		lang: i18nHead.value.htmlAttrs!.lang,
		class: () => themeClass.value,
		dir: i18nHead.value.htmlAttrs?.dir
	},
	link: [{ rel: 'icon', type: 'image/png', href: '/assets/favicon/favicon.ico' }],
	charset: 'utf-8',
	title: () => config.public.appTitle,
	meta: [
		{
			name: 'msapplication-config',
			content: '/assets/favicon/browserconfig.xml'
		},
		{
			name: 'google-site-verification',
			content: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION
		},
		...(i18nHead.value.meta || [])
	]
}

const schemaOrgOptions = [
	defineOrganization({
		name: config.public.appTitle,
		logo: config.public.appImage,
		sameAs: [
			config.public.socials.facebook,
			config.public.socials.twitter,
			config.public.socials.instagram
		]
	}),
	defineWebSite({
		url: config.public.baseUrl,
		name: config.public.appTitle,
		description: config.public.appDescription,
		inLanguage: locales.value.map((l: any) => l.iso)
	}),
	defineWebPage()
]

const seoMetaOptions = {
	title: config.public.appTitle,
	description: config.public.appDescription,
	colorScheme: colorMode.value === 'dark' ? 'dark' : 'light',
	themeColor: themeColor.value,
	applicationName: config.public.appTitle,
	author: config.public.author.name,
	creator: config.public.author.name,
	publisher: config.public.author.name,
	ogTitle: `${config.public.appTitle}`,
	ogType: 'website',
	ogUrl: config.public.baseUrl,
	ogImage: config.public.appImage,
	ogImageAlt: config.public.appTitle,
	ogSiteName: config.public.appTitle,
	ogLocale: locale.value,
	ogLocaleAlternate: locales.value.map((l: any) => l.iso),
	fbAppId: config.public.facebookAppId,
	twitterCard: 'summary_large_image',
	twitterTitle: config.public.appTitle,
	twitterDescription: config.public.appDescription,
	twitterImage: config.public.appImage,
	mobileWebAppCapable: 'yes',
	msapplicationTileImage: config.public.appImage,
	msapplicationTileColor: themeColor.value
} satisfies UseSeoMetaInput

const ogImageOptions = {
	title: config.public.appTitle,
	description: config.public.appDescription,
	alt: config.public.appTitle,
	cache: true,
	cacheKey: 'og-image',
	cacheTtl: 60 * 60 * 24 * 7
}

useHead(headOptions)
useSchemaOrg(schemaOrgOptions)
useSeoMeta(seoMetaOptions)
defineOgImageComponent('NuxtSeo', ogImageOptions)
</script>

<template>
	<div id="#app" class="app">
		<NuxtPwaManifest />
		<LoadingIndicator />
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
		<Pwa />
		<CookieControl />
		<UNotifications />
		<DebugTools />
	</div>
</template>
