<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: ['auth', 'auth-no-totp']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.totp.activate.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<div
				class="container-xxs p-0 md:px-6 bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded p-4"
			>
				<AuthMfaTotpActivate />
				<AuthMfaTotpActivateForm />
			</div>
		</PageBody>
	</PageWrapper>
</template>
