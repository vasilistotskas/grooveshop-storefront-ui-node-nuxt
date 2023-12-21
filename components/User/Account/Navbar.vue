<template>
	<nav
		class="fixed top-16 left-0 z-10 w-full bg-white dark:bg-zinc-800 lg:static lg:w-auto lg:border-b lg:border-gray-300 lg:shadow-none lg:bg-transparent px-4 lg:px-0"
	>
		<ul
			role="tablist"
			class="flex gap-4 overflow-x-auto scroll-snap-x-mandatory lg:justify-start"
		>
			<li role="tab" class="whitespace-nowrap">
				<Anchor
					:to="`/account/settings`"
					:aria-label="$t('pages.account.settings.title')"
					:title="$t('pages.account.settings.title')"
					class="block outline-none py-4 text-xs leading-tight text-gray-600 lg:py-2 hover:text-black dark:text-white lg:router-link-active:font-bold"
				>
					<span>
						{{ $t('pages.account.settings.title') }}
					</span>
				</Anchor>
			</li>
			<li role="tab" class="whitespace-nowrap">
				<Anchor
					:to="`/account/addresses`"
					:aria-label="$t('pages.account.settings.title')"
					:title="$t('pages.account.addresses.title')"
					class="block outline-none py-4 text-xs leading-tight text-gray-600 lg:py-2 hover:text-black dark:text-white lg:router-link-active:font-bold"
				>
					<span>
						{{ $t('pages.account.addresses.title') }}
					</span>
				</Anchor>
			</li>
		</ul>
	</nav>
</template>
