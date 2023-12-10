<script lang="ts" setup>
const userStore = useUserStore()
await userStore.fetchAccount()

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
			<PageSection> </PageSection>
		</PageBody>
	</PageWrapper>
</template>
