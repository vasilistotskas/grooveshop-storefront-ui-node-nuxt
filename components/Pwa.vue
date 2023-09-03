<script lang="ts" setup>
const pwa = useNuxtApp().$pwa
</script>
<template>
	<ClientOnly>
		<div v-if="pwa" id="pwa">
			<div
				v-if="pwa?.offlineReady || pwa?.needRefresh"
				class="pwa-toast-control-bar"
				role="alert"
			>
				<div class="message">
					<span
						v-if="pwa?.offlineReady"
						class="text-gray-500 dark:text-gray-400 font-medium"
					>
						{{ $t('components.pwa.ready_to_work_offline') }}
					</span>
					<span
						v-if="pwa?.needRefresh"
						class="text-gray-500 dark:text-gray-400 font-medium"
					>
						{{ $t('components.pwa.new_content_available') }}
					</span>
				</div>
				<button
					v-if="pwa?.needRefresh"
					class="text-gray-700 dark:text-gray-200"
					type="button"
					@click="pwa?.updateServiceWorker()"
				>
					{{ $t('components.pwa.reload') }}
				</button>
				<button
					type="button"
					class="text-gray-700 dark:text-gray-200"
					@click="pwa?.cancelPrompt()"
				>
					{{ $t('components.pwa.close') }}
				</button>
			</div>
			<div
				v-if="pwa?.showInstallPrompt && !pwa?.offlineReady && !pwa?.needRefresh"
				class="pwa-toast"
				role="alert"
			>
				<div class="message">
					<span class="text-gray-700 dark:text-gray-200">
						{{ $t('components.pwa.install_pwa') }}
					</span>
				</div>
				<div class="pwa-toast-bar-buttons">
					<button type="button" @click="pwa?.install()">
						{{ $t('components.pwa.install') }}
					</button>
					<button type="button" @click="pwa?.cancelInstall()">
						{{ $t('components.pwa.cancel') }}
					</button>
				</div>
			</div>
		</div>
		<template #fallback>
			<ClientOnlyFallback />
		</template>
	</ClientOnly>
</template>

<style lang="scss" scoped>
.pwa-toast-control-bar {
	@apply fixed bottom-0 left-0 right-0 z-50 mx-auto border px-6 py-4 shadow-xl sm:bottom-6 sm:left-16 sm:right-16 sm:max-w-5xl sm:rounded-md;
	@apply border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800;
	@apply text-gray-600 dark:border-gray-700 dark:text-gray-400;
}

.pwa-toast {
	position: fixed;
	right: 4rem;
	bottom: 0;
	margin: 16px;
	padding: 12px;
	border: 1px solid #8885;
	border-radius: 4px;
	z-index: 1;
	text-align: left;
	box-shadow: 3px 4px 5px 0 #8885;
}

.pwa-toast .message {
	margin-bottom: 8px;
}

.pwa-toast-bar-buttons {
	@apply ml-auto flex flex-col space-y-3 md:space-x-3 md:space-y-0;
	@apply gap-2;
	@apply mt-4 lg:mt-0;
	@apply md:flex-row-reverse;

	button {
		@apply whitespace-nowrap rounded-lg border px-5 py-2.5 text-sm font-medium  transition duration-150 ease-in-out focus:z-10 focus:outline-none focus:ring-4;
		@apply border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 hover:text-gray-700 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700;
	}
}
</style>
