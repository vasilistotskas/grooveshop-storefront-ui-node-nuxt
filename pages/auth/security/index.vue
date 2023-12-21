<script lang="ts" setup>
const links = useBreadcrumbItems()

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<UBreadcrumb :links="links" />
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.title')" />
		</PageHeader>
		<nav
			class="fixed top-16 left-0 z-10 w-full bg-transparent lg:static lg:w-auto lg:border-b lg:border-gray-300 lg:shadow-none lg:bg-transparent px-4 lg:px-0"
		>
			<ul role="tablist" class="flex gap-4 overflow-x-auto snap-x">
				<li role="tab" class="shrink-0">
					<Anchor
						:to="`/auth/security/general`"
						:aria-label="$t('pages.auth.security.general.title')"
						:title="$t('pages.auth.security.general.title')"
						class="block outline-none py-4 whitespace-nowrap text-gray-600 text-sm"
					>
						<span class="text-black dark:text-white">
							{{ $t('pages.auth.security.general.title') }}
						</span>
					</Anchor>
				</li>
				<li role="tab" class="shrink-0">
					<Anchor
						:to="`/auth/security/mfa`"
						:aria-label="$t('pages.auth.security.mfa.title')"
						:title="$t('pages.auth.security.mfa.title')"
						class="block outline-none py-4 whitespace-nowrap text-gray-600 text-sm"
					>
						<span class="text-black dark:text-white">
							{{ $t('pages.auth.security.mfa.title') }}
						</span>
					</Anchor>
				</li>
			</ul>
		</nav>
		<PageBody> </PageBody>
	</PageWrapper>
</template>
