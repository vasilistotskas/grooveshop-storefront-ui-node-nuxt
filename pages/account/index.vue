<script lang="ts" setup>
const { t } = useLang()

definePageMeta({
	layout: 'user'
})
useHead(() => ({
	title: t('pages.account.index.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.account.index.description')
		},
		{
			name: 'keywords',
			content: t('pages.account.index.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.account.index.title'),
	description: t('pages.account.index.description')
})
</script>

<template>
	<PageWrapper>
		<PageHeader class="account-header mb-4">
			<PageTitle :text="$t('pages.account.index.title')" class="account-header-title" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<p class="text-gray-700 dark:text-gray-200">
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia autem debitis ab
					dolorum tempore placeat possimus perferendis porro sit aut nobis quasi hic
					consequuntur, atque impedit nihil totam illo odit?
				</p>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
