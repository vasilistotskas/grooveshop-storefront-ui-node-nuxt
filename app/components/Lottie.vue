<script lang="ts" setup>
import { usePreferredReducedMotion } from '@vueuse/core'

/**
 * Reusable Lottie renderer.
 *
 * - Client-only (Lottie needs a DOM + SVG renderer). `lottie-web` is
 *   dynamically imported so its ~50KB gzipped payload isn't pulled
 *   into the server bundle or pages that don't need it.
 * - Respects `prefers-reduced-motion`: when the user has opted out,
 *   the Lottie engine doesn't mount at all and the `#fallback` slot
 *   renders instead (themed static illustration, or nothing).
 * - Unmounts cleanly on route change to avoid leaking animation
 *   frames into the next page.
 *
 * Callers pass the animation as either:
 *   - `src`: a URL string (remote or public-served JSON)
 *   - `data`: a pre-imported JSON object, or a function returning a
 *     Promise that resolves to one — the latter lets Vite code-split
 *     the JSON separately from the caller's initial bundle:
 *
 *     ```vue
 *     <LazyLottie :data="() => import('~/assets/lotties/404.json')" />
 *     ```
 */

type AnimationSource = Record<string, unknown>
type DataFactory = () => Promise<AnimationSource | { default: AnimationSource }>

const props = withDefaults(defineProps<{
  src?: string
  data?: AnimationSource | DataFactory
  loop?: boolean
  autoplay?: boolean
  ariaLabel?: string
}>(), {
  src: undefined,
  data: undefined,
  loop: true,
  autoplay: true,
  ariaLabel: undefined,
})

const container = ref<HTMLElement | null>(null)
const reducedMotionSetting = usePreferredReducedMotion()
const prefersReducedMotion = computed(() => reducedMotionSetting.value === 'reduce')
const hasMounted = ref(false)
let animationInstance: { destroy: () => void } | null = null

async function resolveAnimationData(): Promise<AnimationSource | null> {
  if (props.data) {
    if (typeof props.data === 'function') {
      const resolved = await (props.data as DataFactory)()
      return (resolved && 'default' in resolved
        ? (resolved as { default: AnimationSource }).default
        : (resolved as AnimationSource))
    }
    return props.data
  }
  if (props.src) {
    const response = await fetch(props.src)
    return response.json()
  }
  return null
}

async function mountLottie() {
  if (!container.value) return
  if (prefersReducedMotion.value) return
  try {
    const [{ default: lottie }, animationData] = await Promise.all([
      import('lottie-web'),
      resolveAnimationData(),
    ])
    if (!animationData || !container.value) return
    animationInstance = lottie.loadAnimation({
      container: container.value,
      renderer: 'svg',
      loop: props.loop,
      autoplay: props.autoplay,
      animationData,
    })
    hasMounted.value = true
  }
  catch (err) {
    log.error({ action: 'lottie:load', error: err, src: props.src })
  }
}

onMounted(mountLottie)

onBeforeUnmount(() => {
  animationInstance?.destroy()
  animationInstance = null
})
</script>

<template>
  <ClientOnly>
    <div v-if="!prefersReducedMotion" class="relative">
      <div
        ref="container"
        :role="ariaLabel ? 'img' : 'presentation'"
        :aria-label="ariaLabel"
        class="w-full"
      />
      <!-- Until lottie-web has loaded the animation, render the
           fallback so the layout height is stable during the async
           import + JSON parse. -->
      <div v-if="!hasMounted" class="absolute inset-0">
        <slot name="fallback" />
      </div>
    </div>
    <div v-else>
      <slot name="fallback" />
    </div>

    <template #fallback>
      <slot name="fallback" />
    </template>
  </ClientOnly>
</template>
