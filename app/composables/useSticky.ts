export const useSticky = (el: HTMLElement, scrollOffset: number) => {
  const onScroll = useThrottleFn(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    el.classList.toggle('sticky', scrollTop > scrollOffset)
  }, 50)

  useEventListener('scroll', onScroll, { passive: true })

  return {
    onScroll,
  }
}
