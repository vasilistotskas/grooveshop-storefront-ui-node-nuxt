import type { ComponentInternalInstance } from 'vue'

export const isHydrated = ref(false)

export function useDeactivated() {
  const deactivated = ref(false)
  onActivated(() => deactivated.value = false)
  onDeactivated(() => deactivated.value = true)

  return deactivated
}

export function onReactivated(hook: () => void, target?: ComponentInternalInstance | null): void {
  const initial = ref(true)
  onActivated(() => {
    if (initial.value)
      return
    hook()
  }, target)
  onDeactivated(() => initial.value = false)
}
