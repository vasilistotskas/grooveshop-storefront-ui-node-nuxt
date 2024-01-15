<template>
	<nav
		class="fixed left-0 top-16 z-10 w-full bg-transparent px-4 lg:static lg:w-auto lg:border-b lg:border-gray-300 lg:bg-transparent lg:px-0 lg:shadow-none"
	>
		<ul role="tablist" class="flex snap-x gap-4 overflow-x-auto">
			<li role="tab" class="shrink-0">
				<Anchor
					:to="`/account/settings`"
					:aria-label="$t('pages.account.settings.title')"
					:title="$t('pages.account.settings.title')"
					class="block whitespace-nowrap py-4 text-sm text-gray-600 outline-none"
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
					class="block whitespace-nowrap py-4 text-sm text-gray-600 outline-none"
				>
					<span class="text-black dark:text-white">
						{{ $t('pages.account.addresses.title') }}
					</span>
				</Anchor>
			</li>
		</ul>
	</nav>
</template>
