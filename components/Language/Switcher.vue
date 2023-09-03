<script lang="ts" setup>
import {
	Listbox,
	ListboxButton,
	ListboxLabel,
	ListboxOption,
	ListboxOptions
} from '@headlessui/vue'

const props = defineProps({
	type: {
		type: String,
		default: 'dropdown-right-top'
	}
})

const currentStyle = toRef(props, 'type')

const { locale, locales, setLocale } = useLang()
const switchLocalePath = useSwitchLocalePath()
const navigateToLocale = (code: string) => {
	setLocale(code)
}
</script>

<template>
	<div class="flex items-center">
		<Listbox
			v-if="currentStyle === 'dropdown-right-top'"
			as="div"
			class="relative flex items-center"
		>
			<ListboxLabel class="sr-only">{{
				$t('components.language.switcher.theme')
			}}</ListboxLabel>
			<ListboxButton
				type="button"
				title="Change Language"
				class="transition-colors duration-300"
			>
				<span class="hidden">{{
					$t('components.language.switcher.change_language')
				}}</span>
				<span class="text-gray-700 dark:text-gray-200 justify-center items-center flex">
					<IconLa:language />
				</span>
			</ListboxButton>
			<ListboxOptions
				class="p-1 absolute z-50 top-full right-0 outline-none bg-white rounded-lg ring-1 ring-gray-900/10 shadow-lg overflow-hidden w-36 py-1 text-sm text-gray-700 font-semibold dark:bg-gray-800 dark:ring-0 dark:highlight-white/5 dark:text-gray-300"
			>
				<ListboxOption
					v-for="lang in locales"
					:key="lang.code"
					:value="lang.code"
					:class="{
						'py-2 px-2 flex items-center cursor-pointer': true,
						'text-sky-500 bg-gray-100 dark:bg-gray-600/30': locale === lang.code,
						'hover:bg-gray-50 dark:hover:bg-gray-700/30': locale !== lang.code
					}"
					@click.prevent.stop="navigateToLocale(lang.code)"
				>
					<NuxtLink :to="switchLocalePath(lang.code)">
						<span class="text-gray-700 dark:text-gray-200 text-sm mr-2">
							{{ lang.flag }}
						</span>
						<span class="text-gray-700 dark:text-gray-200 flex-1 truncate">
							{{ lang.name }}
							<span class="text-gray-700 dark:text-gray-200 text-xs"
								>({{ lang.code }})</span
							>
						</span>
					</NuxtLink>
				</ListboxOption>
			</ListboxOptions>
		</Listbox>
		<select
			v-if="currentStyle === 'select-box'"
			class="w-full px-2 pr-3 py-1 outline-none rounded border bg-transparent text-gray-700 dark:text-gray-300 border-gray-900/10 dark:border-gray-50/[0.2]"
		>
			<option
				v-for="lang in locales"
				:key="lang.code"
				:value="lang.code"
				class="flex items-center space-x-2"
				@click.prevent.stop="navigateToLocale(lang.code)"
			>
				<NuxtLink :to="switchLocalePath(lang.code)">
					{{ lang.flag }} {{ lang.name }} ({{ lang.code }})
				</NuxtLink>
			</option>
		</select>
	</div>
</template>
