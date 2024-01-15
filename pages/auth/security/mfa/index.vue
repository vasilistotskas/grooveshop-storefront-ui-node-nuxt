<script lang="ts" setup>
const { _totpActive } = useAuthSession()

const isTotpActive = _totpActive.get()

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.title')"
			class="text-center capitalize"
		/>
		<UIcon name="i-heroicons-shield-check" class="text-primary-500 mx-auto h-24 w-24" />
		<PageBody>
			<div
				class="container-xxs relative grid items-center justify-center justify-items-center gap-4 p-0 md:px-6"
			>
				<template v-if="isTotpActive">
					<AuthMfaTotpDeactivateButton />
					<UButton :to="'/auth/security/mfa/recovery-codes'">
						{{ $t('pages.auth.security.mfa.recovery.codes.link') }}
					</UButton>
					<UButton :to="'/auth/security/mfa/recovery-codes/generate'">
						{{ $t('pages.auth.security.mfa.recovery.codes.generate.link') }}
					</UButton>
				</template>
				<template v-else>
					<UButton :to="'/auth/security/mfa/totp/activate'">
						{{ $t('pages.auth.security.mfa.totp.activate.link') }}
					</UButton>
				</template>
			</div>
		</PageBody>
	</PageWrapper>
</template>
