<script lang="ts" setup>
definePageMeta({
	layout: 'default',
	middleware: 'guest'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<PageTitle :text="$t('pages.auth.login.title')" class="capitalize text-center" />
		<PageBody>
			<AuthLoginForm />
		</PageBody>
	</PageWrapper>
</template>
