<script lang="ts" setup>
const { t } = useLang()

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
useServerHead(() => ({
	title: t('pages.auth.security.general.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.security.general.description')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.security.general.title'),
	description: t('pages.auth.security.general.description')
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.general.title')" />
		</PageHeader>
		<PageBody> </PageBody>
	</PageWrapper>
</template>
