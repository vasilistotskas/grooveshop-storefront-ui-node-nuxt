export const useSticky = (el: HTMLElement, scrollOffset: number) => {
  const onScroll = useThrottleFn(() => {
    // Callback is also invoked by VueUse during SSR dry runs in some
    // test harnesses; guard before touching the DOM globals.
    if (!import.meta.client) return
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    el.classList.toggle('sticky', scrollTop > scrollOffset)
  }, 50)

  useEventListener('scroll', onScroll, { passive: true })

  return {
    onScroll,
  }
}
