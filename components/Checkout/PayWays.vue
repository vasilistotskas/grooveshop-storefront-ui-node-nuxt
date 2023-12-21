<script lang="ts" setup>
import {
	RadioGroup,
	RadioGroupDescription,
	RadioGroupLabel,
	RadioGroupOption
} from '@headlessui/vue'
import { PayWayEnum } from '~/types/pay-way'
import type { PayWay } from '~/types/pay-way'
import CreditCardJSON from '~/assets/lotties/credit_card.json'
import PayOnDeliveryJSON from '~/assets/lotties/pay_on_delivery.json'

defineSlots<{
	error(props: {}): any
}>()

const payWayStore = usePayWayStore()
const { payWay, getActivePayWays, pending } = storeToRefs(payWayStore)
const { fetchPayWays } = payWayStore

const { t, locale } = useLang()
const { extractTranslated } = useTranslationExtractor()

const emit = defineEmits(['updatev-model'])

const payWayExtraCost = (payWay: PayWay): string => {
	if (payWay.freeForOrderAmount < 10) {
		return '(<span class="checkout-pay_way-cost-free green">Free</span>)'
	}
	return '(+' + payWay.cost + '€ per shipment)'
}

await fetchPayWays()

const selectedPayWay = computed(() => {
	return payWay.value || undefined
})

const getPayWayLottie = (name: string) => {
	switch (name) {
		case PayWayEnum.CREDIT_CARD: {
			return CreditCardJSON
		}
		case PayWayEnum.PAY_ON_DELIVERY: {
			return PayOnDeliveryJSON
		}
		default: {
			return CreditCardJSON
		}
	}
}

const updatePayWay = (value: PayWay) => {
	emit('updatev-model', payWay)
	payWay.value = value
}
</script>

<template>
	<div class="grid gap-4">
		<div class="grid place-items-center">
			<h3 class="text-primary-700 dark:text-primary-100 text-md font-bold">
				{{ t('components.checkout.pay_ways.title') }}
			</h3>
		</div>
		<div>
			<template v-if="!pending.payWays && getActivePayWays?.length">
				<RadioGroup
					:model-value="selectedPayWay"
					by="id"
					name="pay-way"
					@update:model-value="(value) => updatePayWay(value)"
				>
					<RadioGroupLabel class="sr-only">
						{{ t('components.checkout.pay_ways.label') }}
					</RadioGroupLabel>
					<div class="space-y-2">
						<RadioGroupOption
							v-for="option in getActivePayWays"
							:key="option.id"
							v-slot="{ active, checked }"
							:value="option"
							as="template"
						>
							<div
								:class="[
									active
										? 'ring-1 ring-white ring-opacity-60 ring-offset-1 ring-offset-sky-300'
										: '',
									checked ? 'bg-sky-900 bg-opacity-75' : 'bg-zinc-50 dark:bg-zinc-900'
								]"
								class="relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none"
							>
								<div
									class="grid w-full items-center justify-between"
									:class="checked ? 'grid-cols-3' : 'grid-cols-2'"
								>
									<div class="grid items-center">
										<div class="text-sm">
											<RadioGroupLabel
												:class="
													checked
														? 'text-white'
														: 'text-primary-700 dark:text-primary-100'
												"
												as="p"
												class="font-medium"
											>
												{{ extractTranslated(option, 'name', locale) }}
											</RadioGroupLabel>
											<RadioGroupDescription
												:class="
													checked
														? 'text-sky-100'
														: 'text-primary-700 dark:text-primary-100'
												"
												as="span"
												class="inline"
											>
												<span>{{ option.cost }}</span>
											</RadioGroupDescription>
										</div>
									</div>
									<LazyLottie
										class="grid"
										:animation-data="
											getPayWayLottie(extractTranslated(option, 'name', locale))
										"
										:width="'40px'"
									/>
									<div
										v-if="checked"
										class="grid w-full h-full justify-items-end items-center"
									>
										<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24">
											<circle cx="12" cy="12" fill="#fff" fill-opacity="0.2" r="12" />
											<path
												d="M7 13l3 3 7-7"
												stroke="#fff"
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="1.5"
											/>
										</svg>
									</div>
								</div>
							</div>
						</RadioGroupOption>
					</div>
				</RadioGroup>
			</template>
		</div>
		<slot name="error" />
	</div>
</template>
