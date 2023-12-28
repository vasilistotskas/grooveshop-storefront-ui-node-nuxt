<script lang="ts" setup>
definePageMeta({
	layout: 'default',
	middleware: 'guest'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<PageTitle
			:text="$t('pages.auth.registration.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthRegistrationForm />
		</PageBody>
	</PageWrapper>
</template>
