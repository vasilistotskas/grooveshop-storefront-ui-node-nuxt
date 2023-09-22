<template>
	<li class="add-new">
		<p class="text-gray-700 dark:text-gray-200">
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

<style lang="scss" scoped>
.add-new {
	position: relative;
	font-size: 16px;
	line-height: 21px;
	min-height: 305px;
	display: grid;
	justify-content: center;
	align-content: center;
	align-items: center;
	justify-items: center;
	gap: 2rem;
	border: 2px dashed #dcdcdc;
	background: none;
	text-align: left;
	color: #707070;

	@media screen and (width >= 961px) {
		overflow-y: hidden;
	}

	@media screen and (width >= 634px) {
		padding: 40px 16px 16px;
	}
}
</style>
