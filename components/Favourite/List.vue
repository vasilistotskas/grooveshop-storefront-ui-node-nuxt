<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Favourite } from '~/types/product/favourite'

defineProps({
	favourites: {
		type: Array as PropType<Favourite[] | null>,
		required: true
	},
	displayTotal: {
		type: Boolean,
		required: false,
		default: true
	}
})
</script>

<template>
	<div class="grid w-full items-start gap-4">
		<div v-if="displayTotal" class="flex items-center justify-center gap-1">
			<span class="text-[0.75rem] font-semibold text-[#f0c14b]">{{
				favourites?.length
			}}</span>
			<span class="text-[0.75rem] font-semibold text-[#f0c14b]">
				{{ $t('components.favourite.list.favourites') }}
			</span>
		</div>
		<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			<template v-for="favourite in favourites" :key="favourite.id">
				<ProductCard
					v-if="typeof favourite.product !== 'number'"
					:product="favourite.product"
					:show-add-to-cart-button="false"
					:img-width="120"
					:img-height="150"
				/>
			</template>
		</ul>
	</div>
</template>
