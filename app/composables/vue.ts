import type { ComponentInternalInstance } from 'vue'

export function onReactivated(hook: () => void, target?: ComponentInternalInstance | null): void {
  const initial = ref(true)
  onActivated(() => {
    if (initial.value)
      return
    hook()
  }, target)
  onDeactivated(() => initial.value = false)
}
