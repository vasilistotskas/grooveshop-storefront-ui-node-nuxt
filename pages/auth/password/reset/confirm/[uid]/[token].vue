<script lang="ts" setup>
const links = useBreadcrumbItems()

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<UBreadcrumb :links="links" />
		<PageTitle
			:text="$t('pages.auth.password.reset.confirm.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthPasswordResetConfirmForm />
		</PageBody>
	</PageWrapper>
</template>
