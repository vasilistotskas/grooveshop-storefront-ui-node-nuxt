<script lang="ts" setup>
const { t } = useLang()

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper>
		<PageHeader class="account-header">
			<PageTitle :text="$t('pages.account.index.title')" class="account-header-title" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<p class="text-primary-700 dark:text-primary-100">
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia autem debitis ab
					dolorum tempore placeat possimus perferendis porro sit aut nobis quasi hic
					consequuntur, atque impedit nihil totam illo odit?
				</p>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
