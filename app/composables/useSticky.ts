export const useSticky = (el: HTMLElement, offset: number) => {
  const onScroll = useThrottleFn(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    el.classList.toggle('sticky', scrollTop > offset)
  }, 50)

  useEventListener('scroll', onScroll, { passive: true })

  return {
    onScroll,
  }
}
