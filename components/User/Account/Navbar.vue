<template>
	<nav
		class="fixed top-16 left-0 z-10 w-full bg-transparent lg:static lg:w-auto lg:border-b lg:border-gray-300 lg:shadow-none lg:bg-transparent px-4 lg:px-0"
	>
		<ul role="tablist" class="flex gap-4 overflow-x-auto snap-x">
			<li role="tab" class="shrink-0">
				<Anchor
					:to="`/account/settings`"
					:aria-label="$t('pages.account.settings.title')"
					:title="$t('pages.account.settings.title')"
					class="block outline-none py-4 whitespace-nowrap text-gray-600 text-sm"
				>
					<span class="text-black dark:text-white">
						{{ $t('pages.account.settings.title') }}
					</span>
				</Anchor>
			</li>
			<li role="tab" class="shrink-0">
				<Anchor
					:to="`/account/addresses`"
					:aria-label="$t('pages.account.settings.title')"
					:title="$t('pages.account.addresses.title')"
					class="block outline-none py-4 whitespace-nowrap text-gray-600 text-sm"
				>
					<span class="text-black dark:text-white">
						{{ $t('pages.account.addresses.title') }}
					</span>
				</Anchor>
			</li>
		</ul>
	</nav>
</template>
