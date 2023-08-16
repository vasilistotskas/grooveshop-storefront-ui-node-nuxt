<template>
	<ClientOnly>
		<Teleport to="body">
			<iframe v-if="isCookieFunctionalEnabled" />
			<div v-else class="cookieControl-BlockedIframe">
				<p>
					{{ $t('components.cookie.iframe_blocked') }}
					<a
						href="#"
						@click.prevent="isModalActive = true"
						v-text="$t('components.cookie.here')"
					/>
				</p>
			</div>
		</Teleport>
		<template #fallback>
			<ClientOnlyFallback />
		</template>
	</ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { Cookie } from '#cookie-control/types'

const { t } = useLang()

const { cookiesEnabled, isModalActive } = useCookieControl()

// computations
const isCookieFunctionalEnabled = computed(
	() =>
		(cookiesEnabled.value || []).filter(
			(cookieEnabled: Cookie) => cookieEnabled.name === 'functional'
		).length > 0
)
</script>
