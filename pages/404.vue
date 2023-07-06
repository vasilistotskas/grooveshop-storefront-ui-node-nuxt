<script lang="ts" setup>
import { capitalize } from '~/utils/str'
import { ITheme } from '~/utils/theme'

// composable
const config = useRuntimeConfig()
const { t } = useLang()
const theme = useState<ITheme>('theme.current')
const themeClass = computed(() => (theme.value === 'dark' ? 'dark' : 'light'))
const themeColor = computed(() => (theme.value === 'dark' ? '#1a202c' : '#ffffff'))

// compiler macro
definePageMeta({
	layout: 'page'
})
useHead(() => ({
	title: capitalize(t('pages.404.title')),
	meta: [
		{
			name: 'description',
			content: t('pages.products.description')
		},
		{
			name: 'keywords',
			content: t('pages.products.keywords')
		}
	]
}))

useServerSeoMeta({
	colorScheme: computed(() => (theme.value === 'dark' ? 'dark' : 'light')),
	applicationName: computed(() => config.public.appTitle),
	themeColor: computed(() => (theme.value === 'dark' ? '#000000' : '#ffffff'))
})
</script>

<template>
	<PageWrapper class="flex flex-col items-center justify-center">
		<Error :code="404" />
	</PageWrapper>
</template>
