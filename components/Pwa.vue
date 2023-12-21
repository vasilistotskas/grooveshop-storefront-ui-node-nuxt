<script lang="ts" setup>
const { $pwa } = useNuxtApp()
const isPWAInstalled = computed(() => $pwa?.isPWAInstalled)
</script>

<template>
	<ClientOnly>
		<div v-if="$pwa" id="pwa">
			<div
				v-if="$pwa?.offlineReady || $pwa?.needRefresh"
				class="fixed bottom-0 left-0 right-0 z-50 mx-auto px-6 py-4 shadow-xl border border-gray-200 bg-zinc-50 dark:border-gray-700 dark:bg-zinc-800 text-primary-600 dark:text-primary-400 sm:bottom-6 sm:left-16 sm:right-16 sm:max-w-5xl sm:rounded-md"
				role="alert"
			>
				<div class="message">
					<span
						v-if="$pwa?.offlineReady"
						class="text-primary-700 dark:text-primary-400 font-medium"
					>
						{{ $t('components.pwa.ready_to_work_offline') }}
					</span>
					<span
						v-if="$pwa?.needRefresh"
						class="text-primary-700 dark:text-primary-400 font-medium"
					>
						{{ $t('components.pwa.new_content_available') }}
					</span>
				</div>
				<button
					v-if="$pwa?.needRefresh"
					class="text-primary-700 dark:text-primary-100"
					type="button"
					@click="$pwa?.updateServiceWorker()"
				>
					{{ $t('components.pwa.reload') }}
				</button>
				<button
					type="button"
					class="text-primary-700 dark:text-primary-100"
					@click="$pwa?.cancelPrompt()"
				>
					{{ $t('components.pwa.close') }}
				</button>
			</div>
			<div
				v-if="$pwa?.showInstallPrompt && !$pwa?.offlineReady && !$pwa?.needRefresh"
				class="fixed right-16 bottom-0 mb-4 p-3 border border-gray-200 bg-white dark:bg-zinc-800 shadow-md rounded sm:flex sm:gap-2 sm:text-center"
				role="alert"
			>
				<div
					class="mb-2 sm:grid sm:align-center sm:items-center sm:justify-center sm:w-full sm:mb-0"
				>
					<span class="text-primary-700 dark:text-primary-100 text-center capitalize">
						{{ $t('components.pwa.install_pwa') }}
					</span>
				</div>
				<div
					class="ml-auto flex flex-col gap-2 mt-4 lg:mt-0 md:flex-row-reverse sm:flex sm:w-full sm:flex-row sm:m-0"
				>
					<button
						type="button"
						class="whitespace-nowrap rounded-lg border px-3 py-2 md:px-5 md:py-2.5 text-sm font-medium transition duration-150 ease-in-out focus:z-10 focus:outline-none focus:ring-4 border-gray-200 bg-zinc-50 text-primary-900 hover:bg-zinc-100 hover:text-primary-700 focus:ring-gray-200 dark:border-gray-600 dark:bg-zinc-800 dark:text-primary-400 dark:hover:bg-zinc-700 dark:hover:text-white dark:focus:ring-gray-700 sm:m-0"
						@click="$pwa?.install()"
					>
						{{ $t('components.pwa.install') }}
					</button>
					<button
						type="button"
						class="whitespace-nowrap rounded-lg border px-3 py-2 md:px-5 md:py-2.5 text-sm font-medium transition duration-150 ease-in-out focus:z-10 focus:outline-none focus:ring-4 border-gray-200 bg-zinc-50 text-primary-900 hover:bg-zinc-100 hover:text-primary-700 focus:ring-gray-200 dark:border-gray-600 dark:bg-zinc-800 dark:text-primary-400 dark:hover:bg-zinc-700 dark:hover:text-white dark:focus:ring-gray-700 sm:m-0"
						@click="$pwa?.cancelInstall()"
					>
						{{ $t('components.pwa.cancel') }}
					</button>
				</div>
			</div>
		</div>
		<UAlert
			v-else-if="isPWAInstalled"
			:description="$t('components.pwa.pwa_installed')"
			:title="$t('components.pwa.pwa_installed_title')"
		/>
		<template #fallback>
			<ClientOnlyFallback class="pwa-toast" />
		</template>
	</ClientOnly>
</template>
