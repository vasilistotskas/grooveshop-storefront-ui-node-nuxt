<template>
	<div class="relative font-sans" n="green6">
		<div class="container max-w-200 mx-auto py-10 px-4">
			<h1>{{ error?.message }}</h1>
			There was an error 😱

			<br />
			<button type="button" @click="handleError">Clear error</button>
			<br />
			<NuxtLink to="/404"> Trigger another error </NuxtLink>
			<br />
			<NuxtLink to="/"> Navigate home </NuxtLink>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { FetchError } from 'ofetch'
import { ITheme } from '~/utils/theme'

const props = defineProps({
	error: {
		type: Object as PropType<FetchError | null>,
		required: false,
		default: null
	}
})

const route = useRoute()
const router = useRouter()

const theme = useState<ITheme>('theme.current')
const themeClass = computed(() => (theme.value === 'dark' ? 'dark' : 'light'))

const i18nHead = useLocaleHead({
	addDirAttribute: true,
	addSeoAttributes: true,
	identifierAttribute: 'hid',
	route,
	router,
	i18n: useI18n()
})
useHead({
	title: 'Error',
	htmlAttrs: {
		lang: i18nHead.value.htmlAttrs!.lang,
		class: () => themeClass.value,
		dir: i18nHead.value.htmlAttrs?.dir
	},
	link: [...(i18nHead.value.link || [])],
	meta: [...(i18nHead.value.meta || [])]
})
useServerSeoMeta({
	title: 'Error',
	description: 'Error page'
})

const handleError = () => clearError({ redirect: '/' })
</script>
