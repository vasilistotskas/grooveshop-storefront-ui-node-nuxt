<template>
	<nav
		class="fixed left-0 top-16 z-10 w-full bg-transparent px-4 lg:static lg:w-auto lg:border-b lg:border-gray-300 lg:bg-transparent lg:px-0 lg:shadow-none"
	>
		<ul role="tablist" class="flex snap-x gap-4 overflow-x-auto">
			<li role="tab" class="shrink-0">
				<Anchor
					:to="`/auth/security/password`"
					:aria-label="$t('pages.auth.security.password.title')"
					:title="$t('pages.auth.security.password.title')"
					class="block whitespace-nowrap py-4 text-sm text-gray-600 outline-none"
				>
					<span class="text-black dark:text-white">
						{{ $t('pages.auth.security.password.title') }}
					</span>
				</Anchor>
			</li>
			<li role="tab" class="shrink-0">
				<Anchor
					:to="`/auth/security/mfa`"
					:aria-label="$t('pages.auth.security.mfa.title')"
					:title="$t('pages.auth.security.mfa.title')"
					class="block whitespace-nowrap py-4 text-sm text-gray-600 outline-none"
				>
					<span class="text-black dark:text-white">
						{{ $t('pages.auth.security.mfa.title') }}
					</span>
				</Anchor>
			</li>
		</ul>
	</nav>
</template>
