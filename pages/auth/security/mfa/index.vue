<script lang="ts" setup>
import { parseBoolean } from '~/utils/boolean'

const { _totpActive } = useAuthSession()

const isTotpActive = computed(() => parseBoolean(_totpActive.get()))

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.mfa.title')" class="capitalize" />
		</PageHeader>
		<AuthSecurityNavbar />
		<UIcon name="i-heroicons-shield-check" class="text-primary-500 mx-auto h-24 w-24" />
		<PageBody>
			<div
				class="container-xxs relative grid items-center justify-center justify-items-center gap-4 p-0 md:px-6"
			>
				<template v-if="isTotpActive">
					<AuthMfaTotpDeactivateButton />
					<UButton :to="'/auth/security/mfa/recovery-codes'" color="white">
						{{ $t('pages.auth.security.mfa.recovery.codes.link') }}
					</UButton>
					<UButton :to="'/auth/security/mfa/recovery-codes/generate'" color="white">
						{{ $t('pages.auth.security.mfa.recovery.codes.generate.link') }}
					</UButton>
				</template>
				<template v-else>
					<UButton :to="'/auth/security/mfa/totp/activate'" color="white">
						{{ $t('pages.auth.security.mfa.totp.activate.link') }}
					</UButton>
				</template>
			</div>
		</PageBody>
	</PageWrapper>
</template>
