<template>
	<li
		class="relative font-normal text-base leading-6 min-h-[305px] grid place-content-center place-items-center gap-8 border-2 border-dashed border-gray-300 bg-transparent text-left text-gray-600"
	>
		<p class="text-primary-700 dark:text-primary-100">
			{{ $t('components.address.add_new.title') }}
		</p>
		<div class="grid items-center justify-center">
			<MainButton
				:text="$t('components.address.add_new.button')"
				type="link"
				to="/account/addresses/new"
				size="lg"
				class="w-full"
			/>
		</div>
	</li>
</template>
