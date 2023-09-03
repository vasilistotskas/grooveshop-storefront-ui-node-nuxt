<script lang="ts" setup>
import { Title } from '@unhead/schema'
import { AppSetup } from '~/utils/app'
import { IThemeValue } from '~/utils/theme'
import { GlobalEvents } from '~/events/global'
import pkg from '~/package.json'

AppSetup()
const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const { locale, locales } = useLang()
const themeValue = useState<IThemeValue>('theme.current')

const cartStore = useCartStore()
await cartStore.fetchCart()

const refreshCart = async () => await cartStore.fetchCart()

const title = computed(() => {
	if ('title' in route.meta) {
		return route.meta.title as string
	}
	return config.public.appTitle
})
const description = computed(() => {
	if ('description' in route.meta) {
		return route.meta.description as string
	}
	return config.public.appDescription
})
const themeClass = computed(() => (themeValue.value === 'dark' ? 'dark' : 'light'))
const themeColor = computed(() => (themeValue.value === 'dark' ? '#1a202c' : '#ffffff'))

const langBus = useEventBus<string>(GlobalEvents.ON_LANGUAGE_UPDATED)
langBus.on((event: string, payload) => {
	// ON_LANGUAGE_UPDATED event
})

const cartBus = useEventBus<string>(GlobalEvents.ON_CART_UPDATED)
cartBus.on((event: string, payload) => {
	refreshCart()
})

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
	link: [
		{ rel: 'manifest', href: 'manifest.webmanifest', crossorigin: 'use-credentials' },
		...(i18nHead.value.link || [])
	],
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

useServerHead(headOptions)
useHead(headOptions)
useSchemaOrg([
	defineOrganization({
		name: config.public.appTitle as string,
		logo: config.public.appImage as string,
		sameAs: [
			'https://www.facebook.com/...',
			'https://twitter.com/...',
			'https://www.instagram.com/...'
		]
	}),
	defineWebSite({
		url: config.public.baseUrl as string,
		name: config.public.appTitle as string,
		description: config.public.appDescription as string,
		inLanguage: locales.value.map((l: any) => l.iso)
	}),
	defineWebPage()
])
useServerSeoMeta({
	title: title.value as Title,
	description: description.value as string,
	colorScheme: () => (themeValue.value === 'dark' ? 'dark' : 'light'),
	themeColor: () => themeColor.value,
	applicationName: config.public.appTitle as string,
	author: config.public.author.name as string,
	creator: config.public.author.name as string,
	publisher: config.public.author.name as string,
	ogTitle: `${config.public.appTitle as string} - v${pkg.version}`,
	ogType: 'website',
	ogUrl: pkg.homepage,
	ogImage: config.public.appImage as string,
	ogImageAlt: pkg.name,
	ogSiteName: config.public.appTitle as string,
	ogLocale: locale.value,
	ogLocaleAlternate: locales.value.map((l: any) => l.iso),
	fbAppId: config.public.facebookAppId as string,
	twitterCard: 'summary_large_image',
	twitterTitle: title.value as string,
	twitterDescription: description.value as string,
	twitterImage: config.public.appImage as string,
	mobileWebAppCapable: 'yes',
	msapplicationTileImage: config.public.appImage as string,
	msapplicationTileColor: () => themeColor.value
})
defineOgImage({
	title: title.value,
	description: description.value,
	alt: title.value,
	cache: true,
	cacheKey: 'og-image',
	cacheTtl: 60 * 60 * 24 * 7
})
</script>

<template>
	<Body>
		<NuxtLoadingIndicator />
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</Body>
	<Pwa />
	<CookieControl />
</template>
